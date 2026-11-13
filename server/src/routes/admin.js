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

/** Every customer's saved bag — collected from the customer account pages. */
router.get(
  '/bags',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const db = await getDb();
    const bags = await db.collection('bags').find({}).sort({ updatedAt: -1 }).toArray();
    const accounts = await db.collection('accounts').find({}).toArray();
    const byId = new Map(accounts.map((account) => [account._id, account]));

    const rows = bags
      .filter((bag) => Array.isArray(bag.items) && bag.items.length > 0)
      .map((bag) => {
        const account = byId.get(bag._id);
        return {
          accountId: bag._id,
          name: account?.name || 'Guest account',
          mobile: account?.mobile || '',
          email: account?.email || '',
          items: bag.items,
          itemCount: bag.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
          value: bag.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
          couponCode: bag.couponCode || '',
          updatedAt: bag.updatedAt,
        };
      });

    res.json({
      bags: rows,
      total: rows.length,
      totalValue: rows.reduce((sum, row) => sum + row.value, 0),
    });
  })
);

/** All registered customer accounts with order and spend roll-up. */
router.get(
  '/accounts',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const db = await getDb();
    const accounts = await db.collection('accounts').find({}).sort({ createdAt: -1 }).toArray();
    const orders = await db.collection('orders').find({}).toArray();
    const bags = await db.collection('bags').find({}).toArray();

    const rows = accounts.map((account) => {
      const mine = orders.filter(
        (order) =>
          order.accountId === account._id ||
          (account.mobile && order.customer?.mobile === account.mobile) ||
          (account.email && order.customer?.email?.toLowerCase() === account.email.toLowerCase())
      );
      const bag = bags.find((entry) => entry._id === account._id);
      return {
        _id: account._id,
        name: account.name || '',
        mobile: account.mobile || '',
        email: account.email || '',
        verified: Boolean(account.verified),
        hasPassword: Boolean(account.passwordHash),
        orders: mine.length,
        spend: mine.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0),
        bagItems: bag?.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0,
        createdAt: account.createdAt,
      };
    });

    res.json({ accounts: rows, total: rows.length });
  })
);

export default router;
