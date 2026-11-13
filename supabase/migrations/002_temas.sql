-- Temas de investigación sugeridos para la pantalla de inicio
create table if not exists public.temas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  area text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.temas enable row level security;
create policy "service_role_all" on public.temas for all to service_role using (true) with check (true);

insert into public.temas (titulo, descripcion, area) values
  ('Inteligencia artificial aplicada a la educación', 'Análisis del uso de herramientas de IA generativa en el aprendizaje universitario y su impacto en el desarrollo de competencias.', 'Tecnología'),
  ('Energías renovables en el norte de México', 'Evaluación del potencial de energía solar en comunidades rurales y su viabilidad socioeconómica.', 'Ingeniería'),
  ('Salud mental en estudiantes universitarios', 'Prevalencia de ansiedad y depresión en alumnos de pregrado y factores asociados al rendimiento académico.', 'Ciencias de la Salud'),
  ('Emprendimiento social en PyMEs', 'Factores que determinan el éxito de emprendimientos sociales en el área metropolitana de Monterrey.', 'Negocios'),
  ('Ciberseguridad en la banca digital', 'Análisis de vulnerabilidades comunes en aplicaciones bancarias móviles y estrategias de mitigación.', 'Tecnología'),
  ('Migración y mercado laboral', 'Impacto de la migración interna en la oferta de trabajo calificado en el noreste del país.', 'Ciencias Sociales'),
  ('Alimentos funcionales y bienestar', 'Efectos del consumo de alimentos funcionales en indicadores de salud metabólica en adultos jóvenes.', 'Ciencias de la Salud'),
  ('Urbanismo y movilidad sustentable', 'Propuestas de movilidad sustentable para campus universitarios y zonas urbanas del área metropolitana.', 'Arquitectura'),
  ('Revolución industrial 4.0 en manufactura', 'Adopción de tecnologías de automatización en la industria manufacturera regional y sus retos.', 'Ingeniería'),
  ('Comunicación digital y comportamiento electoral', 'Efecto de las redes sociales en la participación política de jóvenes en procesos electorales locales.', 'Ciencias Sociales'),
  ('Biotecnología y seguridad alimentaria', 'Aplicación de técnicas biotecnológicas para la detección de patógenos en la cadena de suministro alimentario.', 'Ciencias'),
  ('Economía circular en empresas tecnológicas', 'Modelos de economía circular aplicables a empresas de software y tecnología en Latinoamérica.', 'Negocios')
on conflict do nothing;
