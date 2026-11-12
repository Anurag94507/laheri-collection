import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const COOKIE_NAME = 'raja_token';

export function signAdminToken(username) {
  return jwt.sign({ sub: username, role: 'admin' }, config.jwtSecret, { expiresIn: '24h' });
}

function readToken(req) {
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export function requireAdmin(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Login required.' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { username: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: 'Session expired. Please login again.' });
  }
}

export function optionalAdmin(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      req.user = { username: payload.sub, role: payload.role };
    } catch {
      req.user = null;
    }
  }
  next();
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: config.isProduction });
}
