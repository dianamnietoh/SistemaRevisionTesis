import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { hashPassword } from './auth.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

// ---------- Usuarios ----------
adminRouter.get('/usuarios', async (req, res) => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id,email,nombre,rol,matricula,activo,created_at')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

adminRouter.post('/usuarios', async (req, res) => {
  try {
    const { email, nombre, password, rol = 'alumno', matricula } = req.body || {};
    if (!email || !nombre || !password) {
      return res.status(400).json({ error: 'email, nombre y password requeridos' });
    }
    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        email: email.toLowerCase().trim(),
        nombre,
        password_hash: await hashPassword(password),
        rol,
        matricula
      })
      .select('id,email,nombre,rol,matricula,activo')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

adminRouter.patch('/usuarios/:id', async (req, res) => {
  const allowed = {};
  for (const k of ['nombre', 'matricula', 'activo', 'rol']) {
    if (req.body[k] !== undefined) allowed[k] = req.body[k];
  }
  if (req.body.password) allowed.password_hash = await hashPassword(req.body.password);
  const { data, error } = await supabase
    .from('usuarios')
    .update(allowed)
    .eq('id', req.params.id)
    .select('id,email,nombre,rol,matricula,activo')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// ---------- Rúbrica ----------
adminRouter.get('/rubrica', async (req, res) => {
  const { data, error } = await supabase.from('rubrica').select('*').order('created_at');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

adminRouter.post('/rubrica', async (req, res) => {
  const { nombre, descripcion, criterios, formato_apa = true } = req.body || {};
  if (!nombre || !Array.isArray(criterios) || criterios.length === 0) {
    return res.status(400).json({ error: 'nombre y criterios[] requeridos' });
  }
  const { data, error } = await supabase
    .from('rubrica')
    .insert({ nombre, descripcion, criterios, formato_apa })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

adminRouter.patch('/rubrica/:id', async (req, res) => {
  const allowed = {};
  for (const k of ['nombre', 'descripcion', 'criterios', 'formato_apa', 'activo']) {
    if (req.body[k] !== undefined) allowed[k] = req.body[k];
  }
  const { data, error } = await supabase
    .from('rubrica')
    .update(allowed)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// ---------- Dashboard admin ----------
adminRouter.get('/stats', async (req, res) => {
  const [usuarios, proyectos, entregas] = await Promise.all([
    supabase.from('usuarios').select('id', { count: 'exact', head: true }),
    supabase.from('proyectos').select('id', { count: 'exact', head: true }),
    supabase.from('entregas').select('id,estado,puntaje_total', { count: 'exact' })
  ]);
  const porEstado = (entregas.data || []).reduce((acc, e) => {
    acc[e.estado] = (acc[e.estado] || 0) + 1;
    return acc;
  }, {});
  res.json({
    usuarios: usuarios.count || 0,
    proyectos: proyectos.count || 0,
    entregas: entregas.count || 0,
    entregas_por_estado: porEstado
  });
});
