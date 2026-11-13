-- Sistema de Revisiones de Proyectos de Investigación
-- Ejecutar en el SQL Editor de Supabase.

create extension if not exists "pgcrypto";

-- ---------- Usuarios ----------
create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  nombre text not null,
  password_hash text not null,
  rol text not null check (rol in ('alumno','admin')) default 'alumno',
  matricula text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Rúbrica de evaluación ----------
create table if not exists public.rubrica (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  criterios jsonb not null default '[]'::jsonb,
  -- criterios: [{ "nombre": "...", "descripcion": "...", "peso": 0.2, "max_puntos": 10 }]
  formato_apa boolean not null default true,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Proyectos de investigación ----------
create table if not exists public.proyectos (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.usuarios(id) on delete cascade,
  titulo text not null,
  descripcion text,
  estado text not null default 'activo' check (estado in ('activo','finalizado','suspendido')),
  created_at timestamptz not null default now()
);

-- ---------- Capítulos ----------
create table if not exists public.capitulos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  nombre text not null,
  orden int not null,
  min_revisiones int not null default 5,
  created_at timestamptz not null default now(),
  unique (proyecto_id, orden)
);

-- ---------- Entregas / revisiones ----------
create table if not exists public.entregas (
  id uuid primary key default gen_random_uuid(),
  capitulo_id uuid not null references public.capitulos(id) on delete cascade,
  numero_revision int not null,
  archivo_path text,          -- ruta en Supabase Storage (opcional)
  texto_extraido text,        -- texto plano extraído del documento
  estado text not null default 'pendiente'
    check (estado in ('pendiente','en_revision','completada','error')),
  fecha_entrega timestamptz not null default now(),
  fecha_compromiso timestamptz,   -- fecha estimada de devolución de observaciones
  puntaje_total numeric(5,2),
  retroalimentacion jsonb,        -- resultado completo de la IA
  error_ia text,
  created_at timestamptz not null default now(),
  unique (capitulo_id, numero_revision)
);

-- ---------- Comentarios del docente/admin ----------
create table if not exists public.comentarios (
  id uuid primary key default gen_random_uuid(),
  entrega_id uuid not null references public.entregas(id) on delete cascade,
  autor_id uuid not null references public.usuarios(id),
  comentario text not null,
  created_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_proyectos_alumno on public.proyectos(alumno_id);
create index if not exists idx_capitulos_proyecto on public.capitulos(proyecto_id);
create index if not exists idx_entregas_capitulo on public.entregas(capitulo_id);
create index if not exists idx_entregas_fecha on public.entregas(fecha_entrega desc);

-- RLS: habilitado; el backend usa service_role, así que las políticas
-- permiten todo a service_role y bloquean acceso anónimo.
alter table public.usuarios enable row level security;
alter table public.rubrica enable row level security;
alter table public.proyectos enable row level security;
alter table public.capitulos enable row level security;
alter table public.entregas enable row level security;
alter table public.comentarios enable row level security;

-- Permitir a service_role (backend) acceso total
create policy "service_role_all" on public.usuarios for all to service_role using (true) with check (true);
create policy "service_role_all" on public.rubrica for all to service_role using (true) with check (true);
create policy "service_role_all" on public.proyectos for all to service_role using (true) with check (true);
create policy "service_role_all" on public.capitulos for all to service_role using (true) with check (true);
create policy "service_role_all" on public.entregas for all to service_role using (true) with check (true);
create policy "service_role_all" on public.comentarios for all to service_role using (true) with check (true);

-- ---------- Datos iniciales ----------
-- Capítulos estándar por proyecto (se insertan por trigger o desde el backend).
insert into public.rubrica (nombre, descripcion, formato_apa, criterios) values (
  'Rúbrica base APA 7',
  'Evaluación estándar para capítulos de proyecto de investigación',
  true,
  '[
    {"nombre":"Estructura y organización","descripcion":"Coherencia lógica, secciones completas del capítulo, orden apropiado.","peso":0.25,"max_puntos":10},
    {"nombre":"Contenido y profundidad","descripcion":"Pertinencia del contenido, argumentación, sustento teórico y evidencia.","peso":0.30,"max_puntos":10},
    {"nombre":"Redacción y ortografía","descripcion":"Claridad, gramática, ortografía y estilo académico.","peso":0.15,"max_puntos":10},
    {"nombre":"Formato APA 7 / universitario","descripcion":"Citas, referencias, márgenes, fuente, numeración y estilo exigido.","peso":0.20,"max_puntos":10},
    {"nombre":"Cumplimiento del capítulo","descripcion":"Alineación con los objetivos del capítulo y del proyecto.","peso":0.10,"max_puntos":10}
  ]'::jsonb
) on conflict do nothing;
