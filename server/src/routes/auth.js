import { Router } from 'express';
import { config } from '../config.js';
import { clearAuthCookie, requireAdmin, setAuthCookie, signAdminToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    if (username !== config.admin.username || password !== config.admin.password) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    const token = signAdminToken(config.admin.username);
    setAuthCookie(res, token);
    return res.json({ user: { username: config.admin.username, role: 'admin' }, token });
  })
);

router.get('/me', requireAdmin, (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

export default router;
