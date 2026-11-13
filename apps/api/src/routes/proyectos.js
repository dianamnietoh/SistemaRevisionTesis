import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const CAPITULOS_BASE = [
  { nombre: 'Introducción', orden: 1 },
  { nombre: 'Marco de Referencia', orden: 2 },
  { nombre: 'Metodología', orden: 3 },
  { nombre: 'Resultados', orden: 4 },
  { nombre: 'Discusión de Resultados', orden: 5 },
  { nombre: 'Conclusiones', orden: 6 },
  { nombre: 'Recomendaciones', orden: 7 },
  { nombre: 'Referencias (APA 7)', orden: 8 }
];

export const proyectosRouter = Router();
proyectosRouter.use(requireAuth);

// Listar mis proyectos (alumno) o todos (admin)
proyectosRouter.get('/', async (req, res) => {
  try {
    let q = supabase
      .from('proyectos')
      .select('*, alumno:usuarios!proyectos_alumno_id_fkey(id,nombre,email,matricula)')
      .order('created_at', { ascending: false });

    if (req.user.rol !== 'admin') q = q.eq('alumno_id', req.user.sub);

    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al listar proyectos' });
  }
});

// Crear proyecto con sus 8 capítulos (5 revisiones mínimas cada uno)
proyectosRouter.post('/', requireRole('admin', 'alumno'), async (req, res) => {
  try {
    const alumnoId = req.user.rol === 'admin' ? req.body.alumno_id : req.user.sub;
    const { titulo, descripcion } = req.body || {};
    if (!titulo || !alumnoId) {
      return res.status(400).json({ error: 'titulo y alumno_id requeridos' });
    }

    const { data: proyecto, error } = await supabase
      .from('proyectos')
      .insert({ alumno_id: alumnoId, titulo, descripcion })
      .select()
      .single();
    if (error) throw error;

    const capitulos = CAPITULOS_BASE.map(c => ({ ...c, proyecto_id: proyecto.id }));
    const { error: errCap } = await supabase.from('capitulos').insert(capitulos);
    if (errCap) throw errCap;

    res.status(201).json(proyecto);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al crear proyecto' });
  }
});

// Detalle de un proyecto con capítulos y entregas
proyectosRouter.get('/:id', async (req, res) => {
  try {
    const { data: proyecto, error } = await supabase
      .from('proyectos')
      .select('*, alumno:usuarios!proyectos_alumno_id_fkey(id,nombre,email,matricula)')
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(404).json({ error: 'Proyecto no encontrado' });
    if (req.user.rol !== 'admin' && proyecto.alumno_id !== req.user.sub) {
      return res.status(403).json({ error: 'Sin acceso' });
    }

    const { data: capitulos } = await supabase
      .from('capitulos')
      .select('*, entregas(*)')
      .eq('proyecto_id', proyecto.id)
      .order('orden');

    res.json({ ...proyecto, capitulos: capitulos || [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener proyecto' });
  }
});
