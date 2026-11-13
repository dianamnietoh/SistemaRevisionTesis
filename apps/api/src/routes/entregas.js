import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../db.js';
import { env } from '../config.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { extractText } from '../services/extractText.js';
import { revisarConIA } from '../services/aiReview.js';
import { buildIcsEvent } from '../services/ics.js';

export const entregasRouter = Router();
entregasRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    const ok = ['.docx', '.pdf', '.txt', '.md'].some(e => file.originalname.toLowerCase().endsWith(e));
    if (!ok) return cb(new Error('Solo .docx, .pdf, .txt o .md'));
    cb(null, true);
  }
});

function calcularFechaCompromiso(dias) {
  const d = new Date();
  // Aproximación en días naturales; puede ajustarse a días hábiles si se requiere.
  d.setDate(d.getDate() + dias);
  return d.toISOString();
}

// Subir una revisión: registra fecha, extrae texto y lanza revisión con IA.
entregasRouter.post('/', upload.single('archivo'), async (req, res) => {
  try {
    const { capitulo_id } = req.body || {};
    const textoPegado = req.body?.texto || '';
    if (!capitulo_id) return res.status(400).json({ error: 'capitulo_id requerido' });

    // Verificar que el capítulo pertenece a un proyecto del alumno (o admin)
    const { data: capitulo } = await supabase
      .from('capitulos')
      .select('*, proyecto:proyectos!inner(id,alumno_id,titulo)')
      .eq('id', capitulo_id)
      .single();
    if (!capitulo) return res.status(404).json({ error: 'Capítulo no encontrado' });
    if (req.user.rol !== 'admin' && capitulo.proyecto.alumno_id !== req.user.sub) {
      return res.status(403).json({ error: 'Sin acceso a este capítulo' });
    }

    // Número de revisión siguiente
    const { count } = await supabase
      .from('entregas')
      .select('id', { count: 'exact', head: true })
      .eq('capitulo_id', capitulo_id);
    const numeroRevision = (count || 0) + 1;

    let texto = textoPegado;
    let archivoPath = null;

    if (req.file) {
      texto = texto || (await extractText(req.file.buffer, req.file.mimetype, req.file.originalname));
      // Guardar archivo en Supabase Storage (bucket 'entregas') si existe
      try {
        const path = `${capitulo.proyecto.alumno_id}/${capitulo_id}/${Date.now()}-${req.file.originalname}`;
        const { error: upErr } = await supabase.storage
          .from('entregas')
          .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
        if (!upErr) archivoPath = path;
      } catch { /* storage opcional */ }
    }

    if (!texto || texto.trim().length < 50) {
      return res.status(400).json({ error: 'El documento está vacío o es ilegible (mín. 50 caracteres)' });
    }

    const fechaCompromiso = calcularFechaCompromiso(env.ai.responseDays);

    // Insertar entrega en estado 'en_revision'
    const { data: entrega, error } = await supabase
      .from('entregas')
      .insert({
        capitulo_id,
        numero_revision: numeroRevision,
        archivo_path: archivoPath,
        texto_extraido: texto,
        estado: 'en_revision',
        fecha_compromiso: fechaCompromiso
      })
      .select()
      .single();
    if (error) throw error;

    // Revisión con IA (se espera para garantizar que corra también en serverless)
    try {
      await procesarRevisionIA(entrega.id, capitulo.nombre, numeroRevision, texto);
    } catch (e) {
      console.error('Error en revisión IA', e);
      await supabase.from('entregas').update({
        estado: 'error', error_ia: String(e.message || e)
      }).eq('id', entrega.id);
    }

    res.status(201).json({
      entrega: { ...entrega, texto_extraido: undefined },
      fecha_compromiso: fechaCompromiso,
      mensaje: `Entrega #${numeroRevision} registrada. Observaciones estimadas: ${new Date(fechaCompromiso).toLocaleDateString()}`
    });
  } catch (e) {
    console.error(e);
    res.status(e.message?.includes('Formato') ? 400 : 500).json({ error: e.message || 'Error al registrar entrega' });
  }
});

async function procesarRevisionIA(entregaId, capituloNombre, numeroRevision, texto) {
  const { data: rubrica } = await supabase
    .from('rubrica')
    .select('*')
    .eq('activo', true)
    .order('created_at')
    .limit(1)
    .maybeSingle();

  const resultado = await revisarConIA({
    texto,
    capitulo: capituloNombre,
    rubrica,
    numeroRevision
  });

  await supabase.from('entregas').update({
    estado: 'completada',
    puntaje_total: resultado?.puntaje_total ?? null,
    retroalimentacion: resultado,
    error_ia: null
  }).eq('id', entregaId);
}

// Listar entregas del alumno autenticado
entregasRouter.get('/', async (req, res) => {
  try {
    let q = supabase
      .from('entregas')
      .select('*, capitulo:capitulos!inner(id,nombre,orden,proyecto:proyectos!inner(id,titulo,alumno_id))')
      .order('fecha_entrega', { ascending: false });

    if (req.user.rol !== 'admin') {
      q = q.eq('capitulo.proyecto.alumno_id', req.user.sub);
    }

    const { data, error } = await q;
    if (error) throw error;
    // No exponer texto completo en listados
    res.json((data || []).map(({ texto_extraido, ...rest }) => rest));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al listar entregas' });
  }
});

// Detalle de una entrega (incluye retroalimentación y texto)
entregasRouter.get('/:id', async (req, res) => {
  try {
    const { data: entrega, error } = await supabase
      .from('entregas')
      .select('*, capitulo:capitulos!inner(id,nombre,proyecto:proyectos!inner(alumno_id))')
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(404).json({ error: 'Entrega no encontrada' });
    if (req.user.rol !== 'admin' && entrega.capitulo.proyecto.alumno_id !== req.user.sub) {
      return res.status(403).json({ error: 'Sin acceso' });
    }
    res.json(entrega);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener entrega' });
  }
});

// Descargar evento de calendario (.ics) con la fecha/hora de entrega de
// observaciones y calificación, para que el alumno lo agregue a su calendario.
entregasRouter.get('/:id/calendario', async (req, res) => {
  try {
    const { data: entrega, error } = await supabase
      .from('entregas')
      .select('*, capitulo:capitulos!inner(id,nombre,proyecto:proyectos!inner(titulo,alumno_id))')
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(404).json({ error: 'Entrega no encontrada' });
    if (req.user.rol !== 'admin' && entrega.capitulo.proyecto.alumno_id !== req.user.sub) {
      return res.status(403).json({ error: 'Sin acceso' });
    }

    const cuando = entrega.fecha_compromiso || entrega.fecha_entrega;
    const puntaje = entrega.puntaje_total != null ? ` Puntaje obtenido: ${entrega.puntaje_total}.` : '';
    const ics = buildIcsEvent({
      title: `Entrega de observaciones y calificación — ${entrega.capitulo?.nombre || 'Titulación'}`,
      description:
        `Proyecto: ${entrega.capitulo?.proyecto?.titulo || 'Titulación'}\n` +
        `Revisión #${entrega.numero_revision} entregada el ${new Date(entrega.fecha_entrega).toLocaleString()}.\n` +
        `En esta fecha recibirás las observaciones y la calificación de tu documento.${puntaje}`,
      start: cuando,
      uid: `entrega-${entrega.id}@sistema-titulacion`
    });

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="observaciones-${entrega.id}.ics"`);
    res.send(ics);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al generar el calendario' });
  }
});

// Comentario del docente/admin sobre una entrega
entregasRouter.post('/:id/comentarios', requireRole('admin'), async (req, res) => {
  try {
    const { comentario } = req.body || {};
    if (!comentario) return res.status(400).json({ error: 'comentario requerido' });
    const { data, error } = await supabase
      .from('comentarios')
      .insert({ entrega_id: req.params.id, autor_id: req.user.sub, comentario })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al comentar' });
  }
});
