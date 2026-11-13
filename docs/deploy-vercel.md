# Despliegue en Vercel (monorepo)

## 1. Supabase

1. Crea un proyecto en https://supabase.com.
2. En **SQL Editor**, ejecuta `supabase/migrations/001_init.sql`.
3. Crea el bucket de Storage `entregas` (opcional, para guardar archivos):
   Storage → New bucket → `entregas` (privado).
4. Copia `Project URL` y `service_role` key (Settings → API).

## 2. Backend (`apps/api`) → proyecto Vercel

1. Importa el repo en Vercel y configura **Root Directory** = `apps/api`.
2. Variables de entorno del proyecto:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET` (cadena aleatoria larga)
   - `AI_API_URL`, `AI_API_KEY`, `AI_MODEL`
   - `AI_RESPONSE_DAYS` (ej. 5)
   - `WEB_PUBLIC_URL` = URL del frontend (para CORS)
3. `vercel.json` ya enruta todo a `api/index.js` (función serverless Express).

### Balanceo de carga

El backend incluye un balanceador propio (`src/loadBalancer.js`) basado en el
módulo `cluster` de Node: al ejecutarse fuera de Vercel, levanta `CLUSTER_WORKERS`
procesos (por defecto `min(cpus, 4)`) que comparten el mismo puerto y el SO
reparte las conexiones entre ellos; si un worker cae, el primario lo reinicia.
En Vercel **no aplica** (la plataforma serverless ya distribuye peticiones entre
instancias efímeras) y se desactiva automáticamente.

`maxDuration: 60` permite que la revisión con IA complete dentro del request.

> La revisión IA se ejecuta de forma síncrona dentro del request; si en el
> futuro los documentos son muy grandes, mueve `procesarRevisionIA` a una cola
> (Vercel Cron + endpoint, o Supabase Edge Functions) y responde `202`.

## 3. Frontend (`apps/web`) → proyecto Vercel

1. Importa el mismo repo con **Root Directory** = `apps/web`.
   (Vercel detecta SvelteKit automáticamente; el proyecto usa `@sveltejs/adapter-auto`,
   que aplica el adapter de Vercel al desplegar. `adapter-vercel` queda como
   dependencia explícita por si se prefiere forzarlo.)
2. Variables de entorno:
   - `PUBLIC_API_URL` = `https://<tu-api>.vercel.app`
3. Deploy. El adapter `@sveltejs/adapter-vercel` genera las funciones
   estáticas/dinámicas automáticamente.

## 4. Primer usuario admin

```bash
node -e "const b=require('bcryptjs');console.log(b.hashSync('tu-password',12))"
```

Inserta en Supabase SQL Editor:

```sql
insert into public.usuarios (email, nombre, password_hash, rol)
values ('admin@uni.edu', 'Admin', '<hash>', 'admin');
```

## 5. Calendario del alumno

`GET /api/entregas/:id/calendario` devuelve un `.ics` (requiere `Authorization:
Bearer <token>`) con la fecha/hora de entrega de observaciones y calificación.
El frontend lo descarga con el botón 📅; el alumno solo abre el archivo para
agregarlo a Outlook, Google Calendar o Apple Calendar.

## 6. Local

```bash
cp .env.example .env   # completar
npm install
npm run dev:api        # :4000
npm run dev:web        # :5173
```
