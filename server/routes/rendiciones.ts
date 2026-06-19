import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRol, AuthRequest } from '../middleware/auth';
import { enviarCorreoRendicionEnviada, enviarCorreoRendicionAprobada } from '../services/emailService';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// Configurar multer para subida de archivos
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido. Use JPG, PNG o PDF.'));
  },
});

// GET /api/rendiciones - Listar con filtros
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { estado, zona, desde, hasta, nombre } = req.query;
  try {
    const where: any = {};
    if (estado) where.estado = estado;
    if (zona) where.zona = zona;
    if (nombre) where.nombreRendidor = { contains: nombre as string, mode: 'insensitive' };
    if (desde || hasta) {
      where.fechaEnvio = {};
      if (desde) where.fechaEnvio.gte = new Date(desde as string);
      if (hasta) where.fechaEnvio.lte = new Date(hasta as string);
    }

    // Rendidor solo ve las propias
    if (req.user!.rol === 'rendidor') {
      where.emailRendidor = req.user!.email;
    }

    const rendiciones = await prisma.rendicion.findMany({
      where,
      include: { boletas: true },
      orderBy: { fechaEnvio: 'desc' },
    });

    res.json(rendiciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error consultando rendiciones' });
  }
});

// GET /api/rendiciones/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const rendicion = await prisma.rendicion.findUnique({
      where: { id: req.params.id },
      include: { boletas: true, historialPagos: true },
    });
    if (!rendicion) return res.status(404).json({ error: 'Rendición no encontrada' });
    res.json(rendicion);
  } catch (error) {
    res.status(500).json({ error: 'Error consultando rendición' });
  }
});

// POST /api/rendiciones - Crear nueva
router.post('/', authMiddleware, requireRol('rendidor', 'admin'), upload.array('fotos', 10), async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, periodoDesde, periodoHasta, zona, empresa, boletas: boletasJson } = req.body;
    if (!nombre || !periodoDesde || !periodoHasta || !zona) {
      return res.status(400).json({ error: 'Faltan campos requeridos: nombre, período, zona' });
    }

    const boletas = JSON.parse(boletasJson || '[]');
    if (boletas.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos una boleta' });
    }

    const files = req.files as Express.Multer.File[];
    const fotoMap: Record<number, string> = {};
    files.forEach((f, i) => {
      fotoMap[i] = `/uploads/${f.filename}`;
    });

    const montoTotal = boletas.reduce((sum: number, b: any) => sum + parseFloat(b.monto || 0), 0);

    const rendicion = await prisma.rendicion.create({
      data: {
        nombreRendidor: nombre,
        rutRendidor: req.user?.id ? (await prisma.usuario.findUnique({ where: { id: req.user.id } }))?.rut ?? null : null,
        emailRendidor: req.user!.email,
        fechaPeriodoDesde: new Date(periodoDesde),
        fechaPeriodoHasta: new Date(periodoHasta),
        zona,
        empresa: empresa || 'Cencocal S.A.',
        estado: 'enviada',
        montoTotal,
        usuarioId: req.user!.id,
        boletas: {
          create: boletas.map((b: any, i: number) => ({
            numeroBoleta: b.numeroBoleta || `${Date.now()}-${i}`,
            monto: parseFloat(b.monto),
            detalleGasto: b.detalleGasto,
            fechaBoleta: new Date(b.fechaBoleta || Date.now()),
            proveedor: b.proveedor || null,
            fotoUrl: fotoMap[b.fotoIndex] || null,
            ocrData: b.ocrData || null,
          })),
        },
      },
      include: { boletas: true },
    });

    // Enviar correo a Naiffa
    enviarCorreoRendicionEnviada(rendicion.id).catch(console.error);

    res.status(201).json(rendicion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creando rendición' });
  }
});

// PATCH /api/rendiciones/:id/aprobar
router.patch('/:id/aprobar', authMiddleware, requireRol('naiffa', 'admin'), async (req: AuthRequest, res: Response) => {
  const { comentario, firmaDigital } = req.body;
  try {
    const rendicion = await prisma.rendicion.update({
      where: { id: req.params.id },
      data: {
        estado: 'aprobada',
        fechaAprobacion: new Date(),
        comentarioAutoriza: comentario || null,
        firmaDigitalNaiffa: firmaDigital || 'firma_electronica_registrada',
      },
    });

    enviarCorreoRendicionAprobada(rendicion.id).catch(console.error);

    res.json(rendicion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error aprobando rendición' });
  }
});

// PATCH /api/rendiciones/:id/rechazar
router.patch('/:id/rechazar', authMiddleware, requireRol('naiffa', 'admin'), async (req: AuthRequest, res: Response) => {
  const { comentario } = req.body;
  try {
    const rendicion = await prisma.rendicion.update({
      where: { id: req.params.id },
      data: { estado: 'rechazada', comentarioAutoriza: comentario },
    });
    res.json(rendicion);
  } catch (error) {
    res.status(500).json({ error: 'Error rechazando rendición' });
  }
});

// GET /api/rendiciones/stats/resumen
router.get('/stats/resumen', authMiddleware, requireRol('naiffa', 'secretaria', 'admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, aprobadas, pendientes, pagadas, montoTotal] = await Promise.all([
      prisma.rendicion.count({ where: { fechaEnvio: { gte: inicioMes } } }),
      prisma.rendicion.count({ where: { estado: 'aprobada', fechaEnvio: { gte: inicioMes } } }),
      prisma.rendicion.count({ where: { estado: 'enviada', fechaEnvio: { gte: inicioMes } } }),
      prisma.rendicion.count({ where: { estado: 'pagada', fechaEnvio: { gte: inicioMes } } }),
      prisma.rendicion.aggregate({ _sum: { montoTotal: true }, where: { fechaEnvio: { gte: inicioMes } } }),
    ]);

    res.json({ total, aprobadas, pendientes, pagadas, montoTotal: montoTotal._sum.montoTotal || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Error calculando estadísticas' });
  }
});

export default router;
