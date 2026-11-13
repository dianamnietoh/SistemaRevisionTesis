import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../db.js';
import { signToken, requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const { data: user, error } = await supabase
      .from('usuarios')
      .select('id,email,nombre,password_hash,rol,matricula,activo')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) return res.status(401).json({ error: 'Credenciales inválidas' });
    if (!user.activo) return res.status(403).json({ error: 'Usuario desactivado' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const { password_hash, ...safe } = user;
    res.json({ token: signToken(user), user: safe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

authRouter.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, matricula } = req.body || {};
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son requeridos' });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Correo inválido' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const { data: exists } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();
    if (exists) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });

    const { data: user, error } = await supabase
      .from('usuarios')
      .insert({
        email: cleanEmail,
        nombre: String(nombre).trim(),
        password_hash: await hashPassword(password),
        rol: 'alumno',
        matricula: matricula || null
      })
      .select('id,email,nombre,rol,matricula,activo')
      .single();
    if (error) throw error;

    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const { data } = await supabase
    .from('usuarios')
    .select('id,email,nombre,rol,matricula,activo')
    .eq('id', req.user.sub)
    .single();
  res.json(data);
});

// Cambio de contraseña
export function hashPassword(pw) {
  return bcrypt.hash(pw, 12);
}
