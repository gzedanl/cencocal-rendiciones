import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRol, AuthRequest } from '../middleware/auth';
import * as XLSX from 'xlsx';

const router = Router();
const prisma = new PrismaClient();

// PATCH /api/pagos/:rendicionId/pagar
router.patch('/:rendicionId/pagar', authMiddleware, requireRol('secretaria', 'admin'), async (req: AuthRequest, res: Response) => {
  const { referenciaPago } = req.body;
  try {
    const rendicion = await prisma.rendicion.findUnique({ where: { id: req.params.rendicionId } });
    if (!rendicion) return res.status(404).json({ error: 'Rendición no encontrada' });
    if (rendicion.estado !== 'aprobada') return res.status(400).json({ error: 'Solo se pueden pagar rendiciones aprobadas' });

    const [rendicionActualizada, historial] = await prisma.$transaction([
      prisma.rendicion.update({
        where: { id: req.params.rendicionId },
        data: { estado: 'pagada', fechaPago: new Date() },
      }),
      prisma.historialPago.create({
        data: {
          rendicionId: req.params.rendicionId,
          montoTransferido: rendicion.montoTotal,
          estadoTransferencia: 'completada',
          referenciaPago: referenciaPago || `PAG-${Date.now()}`,
        },
      }),
    ]);

    res.json({ rendicion: rendicionActualizada, historial });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error procesando pago' });
  }
});

// GET /api/pagos/resumen
router.get('/resumen', authMiddleware, requireRol('secretaria', 'admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const [listasParaPagar, pagadas] = await Promise.all([
      prisma.rendicion.findMany({
        where: { estado: 'aprobada' },
        include: { boletas: true },
        orderBy: { fechaAprobacion: 'asc' },
      }),
      prisma.rendicion.findMany({
        where: { estado: 'pagada' },
        include: { boletas: true },
        orderBy: { fechaPago: 'desc' },
        take: 50,
      }),
    ]);

    const totalPendiente = listasParaPagar.reduce((s, r) => s + Number(r.montoTotal), 0);
    const totalPagado = pagadas.reduce((s, r) => s + Number(r.montoTotal), 0);

    res.json({ listasParaPagar, pagadas, totalPendiente, totalPagado });
  } catch (error) {
    res.status(500).json({ error: 'Error calculando resumen de pagos' });
  }
});

// GET /api/pagos/exportar-nomina - Exportar Excel
router.get('/exportar-nomina', authMiddleware, requireRol('secretaria', 'admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const rendiciones = await prisma.rendicion.findMany({
      where: { estado: 'aprobada' },
      orderBy: { fechaAprobacion: 'asc' },
    });

    const datosBancarios = await prisma.datosBancarios.findMany();
    const bancoMap = Object.fromEntries(datosBancarios.map(d => [d.rutRendidor, d]));

    const filas = rendiciones.map(r => {
      const banco = bancoMap[r.rutRendidor || ''];
      return {
        'Nombre': r.nombreRendidor,
        'RUT': r.rutRendidor || '',
        'Zona': r.zona,
        'Período Desde': r.fechaPeriodoDesde.toLocaleDateString('es-CL'),
        'Período Hasta': r.fechaPeriodoHasta.toLocaleDateString('es-CL'),
        'Banco': banco?.nombreBanco || '',
        'N° Cuenta': banco?.numeroCuenta || '',
        'Tipo Cuenta': banco?.tipoCuenta || '',
        'Monto ($)': Number(r.montoTotal),
        'Fecha Aprobación': r.fechaAprobacion?.toLocaleDateString('es-CL') || '',
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas);
    ws['!cols'] = [
      { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Nómina Pagos');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=nomina_pagos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error exportando nómina' });
  }
});

// GET /api/pagos/remesa-bancaria - Generar archivo de remesa
router.get('/remesa-bancaria', authMiddleware, requireRol('secretaria', 'admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const rendiciones = await prisma.rendicion.findMany({ where: { estado: 'aprobada' } });
    const datosBancarios = await prisma.datosBancarios.findMany();
    const bancoMap = Object.fromEntries(datosBancarios.map(d => [d.rutRendidor, d]));

    const fechaHoy = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let contenido = `REMESA BANCARIA CENCOCAL - ${new Date().toLocaleDateString('es-CL')}\n`;
    contenido += `FECHA PROCESO: ${fechaHoy}\n`;
    contenido += `${'='.repeat(80)}\n`;
    contenido += `RUT EMPRESA;NOMBRE;BANCO;CUENTA;TIPO;MONTO;GLOSA\n`;

    let totalMonto = 0;
    for (const r of rendiciones) {
      const banco = bancoMap[r.rutRendidor || ''];
      if (!banco) continue;
      const glosa = `RENDICION ${r.zona} ${r.fechaPeriodoDesde.toLocaleDateString('es-CL')}`;
      contenido += `${r.rutRendidor};${r.nombreRendidor};${banco.nombreBanco};${banco.numeroCuenta};${banco.tipoCuenta};${Number(r.montoTotal).toFixed(0)};${glosa}\n`;
      totalMonto += Number(r.montoTotal);
    }

    contenido += `${'='.repeat(80)}\n`;
    contenido += `TOTAL REGISTROS: ${rendiciones.length}\n`;
    contenido += `MONTO TOTAL: ${totalMonto.toFixed(0)}\n`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=remesa_${fechaHoy}.csv`);
    res.send('﻿' + contenido); // BOM para Excel
  } catch (error) {
    res.status(500).json({ error: 'Error generando remesa' });
  }
});

export default router;
