import jwt from 'jsonwebtoken';
import { env } from '../config.js';

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, rol: user.rol, email: user.email },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.rol)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    next();
  };
}
