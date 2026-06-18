import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRol, AuthRequest } from '../middleware/auth';
import * as XLSX from 'xlsx';

const router = Router();
const prisma = new PrismaClient();

// GET /api/reportes/mes
router.get('/mes', authMiddleware, requireRol('naiffa', 'secretaria', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query;
    const now = new Date();
    const y = parseInt(year as string) || now.getFullYear();
    const m = parseInt(month as string) || now.getMonth();
    const desde = new Date(y, m, 1);
    const hasta = new Date(y, m + 1, 0, 23, 59, 59);

    const rendiciones = await prisma.rendicion.findMany({
      where: { fechaEnvio: { gte: desde, lte: hasta } },
      include: { boletas: true },
      orderBy: { montoTotal: 'desc' },
    });

    const total = rendiciones.length;
    const montoTotal = rendiciones.reduce((s, r) => s + Number(r.montoTotal), 0);
    const porEstado = {
      enviada: rendiciones.filter(r => r.estado === 'enviada').length,
      aprobada: rendiciones.filter(r => r.estado === 'aprobada').length,
      rechazada: rendiciones.filter(r => r.estado === 'rechazada').length,
      pagada: rendiciones.filter(r => r.estado === 'pagada').length,
    };

    // Tiempo promedio de aprobación (en horas)
    const aprobadas = rendiciones.filter(r => r.fechaAprobacion);
    const tiempoPromedio = aprobadas.length > 0
      ? aprobadas.reduce((s, r) => s + (r.fechaAprobacion!.getTime() - r.fechaEnvio.getTime()), 0) / aprobadas.length / 3600000
      : 0;

    // Top rendidores
    const topRendidores = rendiciones.slice(0, 10).map(r => ({
      nombre: r.nombreRendidor,
      zona: r.zona,
      monto: Number(r.montoTotal),
      boletas: r.boletas.length,
    }));

    res.json({ total, montoTotal, porEstado, tiempoPromedioHoras: Math.round(tiempoPromedio * 10) / 10, topRendidores, rendiciones });
  } catch (error) {
    res.status(500).json({ error: 'Error generando reporte' });
  }
});

// GET /api/reportes/exportar-excel
router.get('/exportar-excel', authMiddleware, requireRol('naiffa', 'secretaria', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query;
    const now = new Date();
    const y = parseInt(year as string) || now.getFullYear();
    const m = parseInt(month as string) || now.getMonth();
    const desde = new Date(y, m, 1);
    const hasta = new Date(y, m + 1, 0, 23, 59, 59);

    const rendiciones = await prisma.rendicion.findMany({
      where: { fechaEnvio: { gte: desde, lte: hasta } },
      include: { boletas: true },
    });

    const filas: any[] = [];
    for (const r of rendiciones) {
      for (const b of r.boletas) {
        filas.push({
          'ID Rendición': r.id.slice(0, 8),
          'Rendidor': r.nombreRendidor,
          'RUT': r.rutRendidor || '',
          'Zona': r.zona,
          'Estado': r.estado.toUpperCase(),
          'Período Desde': r.fechaPeriodoDesde.toLocaleDateString('es-CL'),
          'Período Hasta': r.fechaPeriodoHasta.toLocaleDateString('es-CL'),
          'N° Boleta': b.numeroBoleta,
          'Proveedor': b.proveedor || '',
          'Detalle': b.detalleGasto,
          'Fecha Boleta': b.fechaBoleta.toLocaleDateString('es-CL'),
          'Monto Boleta ($)': Number(b.monto),
          'Monto Total Rendición ($)': Number(r.montoTotal),
          'Fecha Envío': r.fechaEnvio.toLocaleDateString('es-CL'),
          'Fecha Aprobación': r.fechaAprobacion?.toLocaleDateString('es-CL') || '',
          'Fecha Pago': r.fechaPago?.toLocaleDateString('es-CL') || '',
        });
      }
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas);
    XLSX.utils.book_append_sheet(wb, ws, 'Rendiciones');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_rendiciones_${y}_${m + 1}.xlsx`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Error exportando Excel' });
  }
});

export default router;
