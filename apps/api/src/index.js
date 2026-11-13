import cluster from 'node:cluster';
import { createApp } from './app.js';
import { env } from './config.js';
import { isBalancingEnabled, startPrimary } from './loadBalancer.js';

const esServerless = process.env.VERCEL === '1';
const esPrimario = isBalancingEnabled() && cluster.isPrimary;

// El proceso primario del balanceador no crea la app: solo supervisa workers.
const app = esPrimario ? null : createApp();

if (esPrimario) {
  startPrimary(env.port);
} else if (!esServerless) {
  const server = app.listen(env.port, () => {
    console.log(`API escuchando en http://localhost:${env.port} (pid ${process.pid})`);
  });
  server.on('error', (err) => {
    console.error(`[api] no se pudo escuchar en el puerto ${env.port}: ${err.message}`);
    // 78 = fallo fatal de bind (p. ej. EADDRINUSE): el balanceador no lo reinicia.
    process.exit(78);
  });
}

// Exportado para Vercel serverless (ver api/index.js)
export default app;
