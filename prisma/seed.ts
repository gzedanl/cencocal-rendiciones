import { PrismaClient, Rol, EstadoRendicion, TipoCuenta } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Sembrando base de datos...');

  // Usuarios de prueba
  const pass = await bcrypt.hash('cencocal2024', 10);

  const rendidor = await prisma.usuario.upsert({
    where: { email: 'guillermo.zedan@cencocal.cl' },
    update: {},
    create: {
      email: 'guillermo.zedan@cencocal.cl',
      password: pass,
      nombre: 'Guillermo Zedan',
      rol: Rol.rendidor,
      rut: '12.345.678-9',
      banco: 'Banco de Chile',
      numeroCuenta: '00123456789',
      tipoCuenta: TipoCuenta.corriente,
    },
  });

  const naiffa = await prisma.usuario.upsert({
    where: { email: 'naiffa.chahuan@cencocal.cl' },
    update: {},
    create: {
      email: 'naiffa.chahuan@cencocal.cl',
      password: pass,
      nombre: 'Naiffa Chahuán',
      rol: Rol.naiffa,
    },
  });

  const secretaria = await prisma.usuario.upsert({
    where: { email: 'secretaria@cencocal.cl' },
    update: {},
    create: {
      email: 'secretaria@cencocal.cl',
      password: pass,
      nombre: 'Ana González',
      rol: Rol.secretaria,
    },
  });

  console.log('Usuarios creados:', { guillermo: rendidor.email, naiffa: naiffa.email, secretaria: secretaria.email });

  // Datos bancarios de prueba
  await prisma.datosBancarios.upsert({
    where: { rutRendidor: '12.345.678-9' },
    update: {},
    create: {
      rutRendidor: '12.345.678-9',
      nombreBanco: 'Banco de Chile',
      numeroCuenta: '00123456789',
      tipoCuenta: TipoCuenta.corriente,
    },
  });

  // Rendiciones de prueba
  const r1 = await prisma.rendicion.create({
    data: {
      nombreRendidor: 'Juan Pérez García',
      rutRendidor: '12.345.678-9',
      emailRendidor: 'guillermo.zedan@cencocal.cl',
      fechaPeriodoDesde: new Date('2026-06-01'),
      fechaPeriodoHasta: new Date('2026-06-15'),
      zona: 'Casa Matriz',
      estado: EstadoRendicion.enviada,
      montoTotal: 45600,
      usuarioId: rendidor.id,
      boletas: {
        create: [
          {
            numeroBoleta: '001234',
            monto: 15000,
            detalleGasto: 'Transporte taxi cliente',
            fechaBoleta: new Date('2026-06-05'),
            proveedor: 'Taxi San Cristóbal',
          },
          {
            numeroBoleta: '005678',
            monto: 18600,
            detalleGasto: 'Almuerzo reunión con proveedor',
            fechaBoleta: new Date('2026-06-10'),
            proveedor: 'Restaurant El Parrón',
          },
          {
            numeroBoleta: '009012',
            monto: 12000,
            detalleGasto: 'Materiales oficina',
            fechaBoleta: new Date('2026-06-12'),
            proveedor: 'Librería Santiago',
          },
        ],
      },
    },
  });

  const r2 = await prisma.rendicion.create({
    data: {
      nombreRendidor: 'María Silva Torres',
      rutRendidor: '15.678.901-2',
      emailRendidor: 'msilva@cencocal.cl',
      fechaPeriodoDesde: new Date('2026-06-01'),
      fechaPeriodoHasta: new Date('2026-06-15'),
      zona: 'Valparaíso',
      estado: EstadoRendicion.aprobada,
      montoTotal: 32500,
      fechaAprobacion: new Date('2026-06-16'),
      usuarioId: rendidor.id,
      boletas: {
        create: [
          {
            numeroBoleta: '011111',
            monto: 22500,
            detalleGasto: 'Combustible visita clientes zona norte',
            fechaBoleta: new Date('2026-06-08'),
            proveedor: 'COPEC',
          },
          {
            numeroBoleta: '022222',
            monto: 10000,
            detalleGasto: 'Peaje autopista',
            fechaBoleta: new Date('2026-06-08'),
            proveedor: 'Autopistas del Sol',
          },
        ],
      },
    },
  });

  const r3 = await prisma.rendicion.create({
    data: {
      nombreRendidor: 'Carlos Rodríguez',
      rutRendidor: '18.901.234-5',
      emailRendidor: 'crodriguez@cencocal.cl',
      fechaPeriodoDesde: new Date('2026-05-15'),
      fechaPeriodoHasta: new Date('2026-05-31'),
      zona: 'Copiapó',
      estado: EstadoRendicion.pagada,
      montoTotal: 78900,
      fechaAprobacion: new Date('2026-06-02'),
      fechaPago: new Date('2026-06-05'),
      usuarioId: rendidor.id,
      boletas: {
        create: [
          {
            numeroBoleta: '033333',
            monto: 55000,
            detalleGasto: 'Pasaje aéreo Santiago-Copiapó',
            fechaBoleta: new Date('2026-05-20'),
            proveedor: 'LATAM Airlines',
          },
          {
            numeroBoleta: '044444',
            monto: 23900,
            detalleGasto: 'Hotel 2 noches',
            fechaBoleta: new Date('2026-05-22'),
            proveedor: 'Hotel Atacama',
          },
        ],
      },
    },
  });

  console.log('Rendiciones de prueba creadas:', r1.id, r2.id, r3.id);
  console.log('\n✅ Seed completado exitosamente');
  console.log('\nCredenciales de prueba:');
  console.log('  Rendidor:   rendidor@cencocal.cl   / cencocal2024');
  console.log('  Naiffa:     naiffa.chahuan@cencocal.cl / cencocal2024');
  console.log('  Secretaria: secretaria@cencocal.cl  / cencocal2024');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
