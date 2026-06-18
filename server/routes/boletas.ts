import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// DELETE /api/boletas/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.boleta.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando boleta' });
  }
});

// PATCH /api/boletas/:id - Actualizar datos de boleta (corrección OCR)
router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { numeroBoleta, monto, detalleGasto, fechaBoleta, proveedor } = req.body;
  try {
    const boleta = await prisma.boleta.update({
      where: { id: req.params.id },
      data: { numeroBoleta, monto, detalleGasto, fechaBoleta: fechaBoleta ? new Date(fechaBoleta) : undefined, proveedor },
    });
    res.json(boleta);
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando boleta' });
  }
});

export default router;
