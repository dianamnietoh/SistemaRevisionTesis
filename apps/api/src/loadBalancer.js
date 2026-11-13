import cluster from 'node:cluster';
import os from 'node:os';

// Balanceador de cargas en proceso: el proceso primario (primary) reparte las
// conexiones entrantes entre N workers que ejecutan la misma app Express.
// Cada worker escucha en el mismo puerto; el kernel/OS distribuye las
// conexiones (round-robin del SO), y el primario reinicia workers caídos.
//
// En Vercel no aplica: la plataforma serverless ya balancea entre funciones.
// Se activa con CLUSTER_WORKERS (default: min(cpus, 4)).

export function workerCount() {
  const n = Number(process.env.CLUSTER_WORKERS || 0);
  if (n > 0) return n;
  return Math.min(os.cpus().length || 1, 4);
}

export function isBalancingEnabled() {
  return process.env.VERCEL !== '1' && workerCount() > 1;
}

// Solo debe llamarse en el proceso primary.
export function startPrimary(port) {
  const total = workerCount();
  console.log(`[balanceador] ${total} workers escuchando en el puerto ${port}`);
  for (let i = 0; i < total; i++) cluster.fork();

  cluster.on('exit', (worker, code) => {
    if (code === 0 || worker.exitedAfterDisconnect) return;
    if (code === 78) {
      console.error(`[balanceador] worker ${worker.process.pid} no pudo bindear el puerto ${port} (¿otra instancia de la API corriendo?). Detén el proceso que lo ocupa y reinicia.`);
      return;
    }
    console.warn(`[balanceador] worker ${worker.process.pid} cayó (code ${code}), reiniciando…`);
    cluster.fork();
  });

  cluster.on('listening', (worker, address) => {
    console.log(`[balanceador] worker ${worker.process.pid} listo en :${address.port}`);
  });
}
