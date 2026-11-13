import { Router } from 'express';
import { supabase } from '../db.js';

export const publicRouter = Router();

// Datos públicos para la pantalla de inicio (sin autenticación)
publicRouter.get('/home', async (req, res) => {
  try {
    const [{ data: temas, error: errTemas }, { data: entregas, error: errEnt }] = await Promise.all([
      supabase
        .from('temas')
        .select('id,titulo,descripcion,area')
        .eq('activo', true)
        .order('created_at')
        .limit(12),
      supabase
        .from('entregas')
        .select('id,puntaje_total,retroalimentacion,fecha_entrega,capitulo:capitulos!inner(nombre,proyecto:proyectos!inner(titulo,alumno_id))')
        .eq('estado', 'completada')
        .not('puntaje_total', 'is', null)
        .order('fecha_entrega', { ascending: false })
        .limit(6)
    ]);
    if (errTemas) throw errTemas;
    if (errEnt) throw errEnt;

    // Nombres de alumnos para las revisiones (solo primer nombre)
    const alumnoIds = [...new Set((entregas || []).map(e => e.capitulo?.proyecto?.alumno_id).filter(Boolean))];
    let nombres = {};
    if (alumnoIds.length) {
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id,nombre')
        .in('id', alumnoIds);
      nombres = Object.fromEntries((usuarios || []).map(u => [u.id, u.nombre]));
    }

    const revisiones = (entregas || []).map(e => {
      const retro = e.retroalimentacion || {};
      const resumen = retro.resumen || retro.observaciones?.[0] || '';
      return {
        id: e.id,
        puntaje: e.puntaje_total,
        veredicto: retro.veredicto || null,
        resumen: String(resumen).slice(0, 220),
        capitulo: e.capitulo?.nombre || null,
        proyecto: e.capitulo?.proyecto?.titulo || null,
        alumno: (nombres[e.capitulo?.proyecto?.alumno_id] || 'Alumno').split(' ')[0],
        fecha: e.fecha_entrega
      };
    });

    res.json({ temas: temas || [], revisiones });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al cargar inicio' });
  }
});
