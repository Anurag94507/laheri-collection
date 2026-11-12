import { Router } from 'express';
import { getDb } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { buildDashboard } from '../services/stats.js';

const router = Router();

router.get(
  '/stats',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const db = await getDb();
    const data = await buildDashboard(db);
    res.json(data);
  })
);

export default router;
