import { Router } from 'express';
import { getDb } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { getSettings, publicSettings } from '../services/settings.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const db = await getDb();
    const settings = await getSettings(db);
    res.json({ settings: publicSettings(settings) });
  })
);

router.get(
  '/offers',
  asyncHandler(async (_req, res) => {
    const db = await getDb();
    const settings = await getSettings(db);
    res.json({ offers: settings.offers, shop: { name: settings.shop.name, phone: settings.shop.phone } });
  })
);

router.put(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const collection = db.collection('settings');
    const current = await getSettings(db);
    const allowed = ['shop', 'social', 'offers', 'shipping', 'chatbot', 'testimonials', 'categories'];
    const patch = {};

    for (const key of allowed) {
      if (req.body?.[key] === undefined) continue;
      const incoming = req.body[key];
      if (Array.isArray(incoming)) patch[key] = incoming;
      else if (incoming && typeof incoming === 'object') patch[key] = { ...(current[key] || {}), ...incoming };
      else patch[key] = incoming;
    }
    patch.updatedAt = new Date().toISOString();

    const existing = await collection.findOne({ _id: 'settings' });
    if (existing) await collection.updateOne({ _id: 'settings' }, { $set: patch });
    else await collection.insertOne({ _id: 'settings', ...patch });

    const updated = await getSettings(db);
    res.json({ settings: publicSettings(updated), message: 'Shop settings saved.' });
  })
);

export default router;
