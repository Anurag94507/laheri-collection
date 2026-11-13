import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const COOKIE_NAME = 'laheri_token';
export const CUSTOMER_COOKIE = 'laheri_customer';

export function signAdminToken(username) {
  return jwt.sign({ sub: username, role: 'admin' }, config.jwtSecret, { expiresIn: '24h' });
}

export function signCustomerToken(accountId) {
  return jwt.sign({ sub: accountId, role: 'customer' }, config.jwtSecret, { expiresIn: '30d' });
}

function readToken(req, cookieName = COOKIE_NAME) {
  const cookieToken = req.cookies?.[cookieName];
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
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Shopkeeper access only.' });
    req.user = { username: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: 'Session expired. Please login again.' });
  }
}

export function requireCustomer(req, res, next) {
  const token = readToken(req, CUSTOMER_COOKIE);
  if (!token) return res.status(401).json({ error: 'Please login with your mobile or email to continue.' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (payload.role !== 'customer') return res.status(403).json({ error: 'Customer access only.' });
    req.customerId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ error: 'Your session expired. Please login again.' });
  }
}

export function optionalCustomer(req, _res, next) {
  const token = readToken(req, CUSTOMER_COOKIE);
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      if (payload.role === 'customer') req.customerId = payload.sub;
    } catch {
      req.customerId = null;
    }
  }
  next();
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

export function setCustomerCookie(res, token) {
  res.cookie(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: config.isProduction });
}

export function clearCustomerCookie(res) {
  res.clearCookie(CUSTOMER_COOKIE, { httpOnly: true, sameSite: 'lax', secure: config.isProduction });
}
