import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import rendicionesRoutes from './routes/rendiciones';
import boletasRoutes from './routes/boletas';
import pagosRoutes from './routes/pagos';
import reportesRoutes from './routes/reportes';

const app = express();
const PORT = process.env.PORT || 3001;

// Seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://rendiciones.cencocal.cl' : 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: 'Demasiadas solicitudes, intenta más tarde.',
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Demasiados intentos de login.',
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Archivos estáticos (fotos subidas)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rutas API
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rendiciones', rendicionesRoutes);
app.use('/api/boletas', boletasRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/reportes', reportesRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React en producción
if (process.env.NODE_ENV === 'production') {
  // En dist/server/server.js, el build de React está en ../../build
  const buildPath = path.join(__dirname, '../../build');
  app.use(express.static(buildPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor Cencocal corriendo en puerto ${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}\n`);
});

export default app;
