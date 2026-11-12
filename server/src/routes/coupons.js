import { Router } from 'express';
import { getDb } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { computeTotals, resolveCoupon } from '../services/pricing.js';
import { asString, normalizeMobile } from '../utils/validate.js';

const router = Router();

router.post(
  '/validate',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { code, mobile, items = [] } = req.body || {};
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Add items to the cart before applying a coupon.' });
    }
    const normalizedItems = items.map((item) => ({
      category: asString(item.category),
      unitPrice: Number(item.unitPrice || 0),
      quantity: Number(item.quantity || 1),
    }));
    const { coupon, message } = await resolveCoupon(db, { code, mobile: normalizeMobile(mobile), items: normalizedItems });
    const preview = computeTotals({ items: normalizedItems, coupon, gstPercent: 0 });
    res.json({
      valid: true,
      message,
      discount: preview.discount,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        applicableOn: coupon.applicableOn,
        validUntil: coupon.validUntil,
      },
    });
  })
);

router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const coupons = await db.collection('coupons').find({}).sort({ createdAt: -1 }).toArray();
    const q = String(req.query.q || '').trim().toLowerCase();
    const filtered = q
      ? coupons.filter((coupon) => [coupon.code, coupon.usedBy, coupon.source].join(' ').toLowerCase().includes(q))
      : coupons;
    res.json({ coupons: filtered, total: filtered.length });
  })
);

export default router;
