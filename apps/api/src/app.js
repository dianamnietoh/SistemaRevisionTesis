import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config.js';
import { authRouter } from './routes/auth.js';
import { proyectosRouter } from './routes/proyectos.js';
import { entregasRouter } from './routes/entregas.js';
import { adminRouter } from './routes/admin.js';
import { publicRouter } from './routes/public.js';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: env.webPublicUrl === '*' ? true : env.webPublicUrl.split(',').map(s => s.trim()),
    credentials: true
  }));
  app.use(express.json({ limit: '2mb' }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);

  app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  app.use('/api/auth', authRouter);
  app.use('/api/proyectos', proyectosRouter);
  app.use('/api/entregas', entregasRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/public', publicRouter);

  // 404
  app.use((req, res) => res.status(404).json({ error: 'No encontrado' }));

  // Error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Error interno' });
  });

  return app;
}
