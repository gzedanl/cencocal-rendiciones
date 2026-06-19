import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRol, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/usuarios - Listar todos los usuarios (solo admin)
router.get('/', authMiddleware, requireRol('admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true, email: true, nombre: true, rol: true,
        rut: true, banco: true, numeroCuenta: true, tipoCuenta: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: 'Error consultando usuarios' });
  }
});

// POST /api/usuarios - Crear usuario (solo admin)
router.post('/', authMiddleware, requireRol('admin'), async (req: AuthRequest, res: Response) => {
  const { email, nombre, password, rol, rut, banco, numeroCuenta, tipoCuenta } = req.body;
  if (!email || !nombre || !password || !rol) {
    return res.status(400).json({ error: 'Email, nombre, contraseña y rol son requeridos' });
  }
  try {
    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) return res.status(400).json({ error: 'Ya existe un usuario con ese email' });

    const hash = await bcrypt.hash(password, 10);
    const usuario = await prisma.usuario.create({
      data: { email, nombre, password: hash, rol, rut, banco, numeroCuenta, tipoCuenta },
      select: { id: true, email: true, nombre: true, rol: true, rut: true, banco: true, numeroCuenta: true, tipoCuenta: true, createdAt: true },
    });

    if (rut && banco && numeroCuenta && tipoCuenta) {
      await prisma.datosBancarios.upsert({
        where: { rutRendidor: rut },
        update: { nombreBanco: banco, numeroCuenta, tipoCuenta },
        create: { rutRendidor: rut, nombreBanco: banco, numeroCuenta, tipoCuenta },
      });
    }

    res.status(201).json(usuario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

// PUT /api/usuarios/:id - Editar usuario (admin o el mismo usuario)
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const esAdmin = req.user!.rol === 'admin';
  const esMismo = req.user!.id === req.params.id;
  if (!esAdmin && !esMismo) {
    return res.status(403).json({ error: 'Sin permisos' });
  }

  const { nombre, email, rol, rut, banco, numeroCuenta, tipoCuenta, passwordNueva } = req.body;
  try {
    const data: any = {};
    if (nombre) data.nombre = nombre;
    if (email) data.email = email;
    if (esAdmin && rol) data.rol = rol;
    if (rut !== undefined) data.rut = rut;
    if (banco !== undefined) data.banco = banco;
    if (numeroCuenta !== undefined) data.numeroCuenta = numeroCuenta;
    if (tipoCuenta !== undefined) data.tipoCuenta = tipoCuenta;
    if (passwordNueva) data.password = await bcrypt.hash(passwordNueva, 10);

    const usuario = await prisma.usuario.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, nombre: true, rol: true, rut: true, banco: true, numeroCuenta: true, tipoCuenta: true },
    });

    // Actualizar datos bancarios si hay RUT
    const rutFinal = rut || (await prisma.usuario.findUnique({ where: { id: req.params.id } }))?.rut;
    if (rutFinal && banco && numeroCuenta && tipoCuenta) {
      await prisma.datosBancarios.upsert({
        where: { rutRendidor: rutFinal },
        update: { nombreBanco: banco, numeroCuenta, tipoCuenta },
        create: { rutRendidor: rutFinal, nombreBanco: banco, numeroCuenta, tipoCuenta },
      });
    }

    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

// DELETE /api/usuarios/:id - Eliminar usuario (solo admin)
router.delete('/:id', authMiddleware, requireRol('admin'), async (req: AuthRequest, res: Response) => {
  if (req.user!.id === req.params.id) {
    return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  }
  try {
    await prisma.usuario.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

export default router;
