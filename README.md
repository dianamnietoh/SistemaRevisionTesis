# Sistema de Titulación — Revisiones de documentos

Monorepo con:

- `apps/web` — Frontend en **SvelteKit** (Svelte 5)
- `apps/api` — Backend en **Node.js + Express**
- `supabase/migrations` — Esquema de base de datos en **Supabase**
- Despliegue objetivo: **Vercel** (frontend como proyecto SvelteKit, backend como funciones serverless que escalan con balanceo automático)

## Funcionalidad

- Login de alumnos y administradores (contraseñas con `bcrypt`, hash en `password_hash`; nunca se guardan en texto plano).
- Los alumnos entregan mínimo **5 revisiones por capítulo** del documento de titulación (Introducción, Marco de Referencia, Metodología, Resultados, Discusión de Resultados, Conclusiones, Recomendaciones y Referencias APA 7ª ed.).
- Al entregar, el sistema registra la fecha y calcula la **fecha compromiso de devolución de observaciones y calificación** (`AI_RESPONSE_DAYS`).
- El alumno puede **descargar un archivo `.ics`** (botón 📅) con la fecha y hora exacta de entrega de sus observaciones y calificación, para agregarla al calendario de su computadora ( Outlook, Google Calendar, Apple Calendar).
- Un servicio de IA extrae el texto del documento (`.docx`, `.pdf`, `.txt`, `.md`) y lo evalúa contra una **rúbrica configurable** + formato APA 7 / formato universitario, devolviendo puntaje, observaciones y comentarios por criterio.
- Panel de administración: alumnos, entregas, rúbrica y estadísticas de avance.
- **Balanceador de cargas** en el backend: al correr con Node local, `src/loadBalancer.js` levanta N workers con `cluster` (configurable con `CLUSTER_WORKERS`), reparte las conexiones entre ellos y reinicia los que fallen.

## Variables sensibles

Todo lo secreto vive en `.env` (raíz del monorepo, ignorado por git). Ver `.env.example` como plantilla. En Vercel se configuran como *Environment Variables* por proyecto.

## Setup local

```bash
npm install
cp .env.example .env   # completa las variables
# aplica las migraciones en el SQL Editor de Supabase
npm run dev:api        # http://localhost:4000 (balanceador activo con CLUSTER_WORKERS)
npm run dev:web        # http://localhost:5173
```

Crea el primer admin insertando un usuario con `rol='admin'` (el hash se genera con `bcryptjs`).

## Despliegue en Vercel

Ver `docs/deploy-vercel.md`.
