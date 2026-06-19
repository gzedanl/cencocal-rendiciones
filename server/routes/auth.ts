import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }
  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' });

    const valido = await bcrypt.compare(password, usuario.password);
    if (!valido) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        rut: usuario.rut,
        banco: usuario.banco,
        numeroCuenta: usuario.numeroCuenta,
        tipoCuenta: usuario.tipoCuenta,
        empresas: (usuario as any).empresas ?? ['Cencocal S.A.'],
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, nombre: true, rol: true, rut: true, banco: true, numeroCuenta: true, tipoCuenta: true, empresas: true },
    });
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
});

// PUT /api/auth/datos-bancarios
router.put('/datos-bancarios', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { rut, banco, numeroCuenta, tipoCuenta } = req.body;
  try {
    await prisma.usuario.update({
      where: { id: req.user!.id },
      data: { rut, banco, numeroCuenta, tipoCuenta },
    });

    if (rut) {
      await prisma.datosBancarios.upsert({
        where: { rutRendidor: rut },
        update: { nombreBanco: banco, numeroCuenta, tipoCuenta },
        create: { rutRendidor: rut, nombreBanco: banco, numeroCuenta, tipoCuenta },
      });
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando datos bancarios' });
  }
});

export default router;
