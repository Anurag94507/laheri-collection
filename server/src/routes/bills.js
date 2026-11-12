import { Router } from 'express';
import { getDb } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler, httpError } from '../middleware/error.js';
import { upsertCustomer } from '../services/crm.js';
import { notifyCustomer, waLink } from '../services/notify.js';
import { computeTotals } from '../services/pricing.js';
import { getSettings } from '../services/settings.js';
import { newId, nextBillNumber } from '../utils/ids.js';
import {
  asNumber,
  asString,
  isValidEmail,
  isValidMobile,
  normalizeMobile,
  paginate,
  roundMoney,
} from '../utils/validate.js';

const router = Router();

router.post(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const settings = await getSettings(db);
    const body = req.body || {};
    const customerInput = body.customer || {};

    const name = asString(customerInput.name);
    const mobile = normalizeMobile(customerInput.mobile);
    const email = asString(customerInput.email);
    if (!name) throw httpError(400, 'Customer name is required for a bill.');
    if (!isValidMobile(mobile)) throw httpError(400, 'Enter a valid 10-digit mobile number.');
    if (email && !isValidEmail(email)) throw httpError(400, 'Enter a valid email address.');

    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (!rawItems.length) throw httpError(400, 'Add at least one item to the bill.');

    const products = await db.collection('products').find({}).toArray();
    const byId = new Map(products.map((product) => [product._id, product]));
    const items = [];

    for (const raw of rawItems) {
      const quantity = Math.max(1, Math.min(asNumber(raw.quantity, 1), 99));
      const product = raw.productId ? byId.get(String(raw.productId)) : null;
      const productName = product?.name || asString(raw.productName);
      if (!productName) throw httpError(400, 'Every bill line needs a product name.');

      let unitPrice = asNumber(raw.unitPrice, 0);
      if (!raw.unitPrice && product) {
        unitPrice = Number(product.discountPrice) > 0 ? Number(product.discountPrice) : Number(product.price);
      }
      if (product && Number(product.stock) < quantity) {
        throw httpError(400, `Only ${product.stock} units of ${product.name} remain.`);
      }
      if (unitPrice <= 0) throw httpError(400, `Enter a price for ${productName}.`);

      items.push({
        productId: product?._id || null,
        productName,
        category: product?.category || asString(raw.category) || 'In-store',
        size: asString(raw.size) || product?.sizes?.[0] || 'Free Size',
        quantity,
        unitPrice: roundMoney(unitPrice),
        totalPrice: roundMoney(unitPrice * quantity),
      });
    }

    const gstPercent = body.gstPercent !== undefined ? asNumber(body.gstPercent, settings.shop.gstPercent) : settings.shop.gstPercent;
    const totals = computeTotals({
      items,
      gstPercent,
      extraDiscount: asNumber(body.extraDiscount || body.discount, 0),
    });

    const paymentMethod = ['cash', 'upi', 'card'].includes(body.paymentMethod) ? body.paymentMethod : 'cash';
    const billNumber = await nextBillNumber(db);
    const now = new Date().toISOString();

    const bill = {
      _id: newId(),
      billNumber,
      customer: { name, mobile, email },
      items,
      ...totals,
      paymentMethod,
      saveToCrm: body.saveToCrm !== false,
      billType: 'offline',
      notes: asString(body.notes),
      createdBy: req.user?.username || 'admin',
      createdAt: now,
    };

    await db.collection('bills').insertOne(bill);
    for (const item of items) {
      if (item.productId) {
        await db.collection('products').updateOne({ _id: item.productId }, { $inc: { stock: -item.quantity } });
      }
    }

    if (bill.saveToCrm) {
      await upsertCustomer(db, {
        name,
        mobile,
        email,
        city: settings.shop.city,
        source: 'offline',
        amount: totals.grandTotal,
        tags: totals.grandTotal >= 5000 ? ['VIP'] : ['Walk-in'],
      });
    }

    const receiptMessage = `Dear ${name}, thank you for shopping at ${settings.shop.name}. Bill ${billNumber}: ₹${totals.grandTotal} (${paymentMethod.toUpperCase()}). Exchange within 7 days with this bill. — ${settings.shop.phone}`;
    let notifications = [];
    if (body.sendReceipt) {
      notifications = await notifyCustomer({
        customer: { mobile, email },
        message: receiptMessage,
        subject: `Your bill ${billNumber} — ${settings.shop.name}`,
        channels: email ? ['whatsapp', 'email'] : ['whatsapp'],
      });
    }

    res.status(201).json({
      bill: { ...bill, notifications },
      whatsappLink: waLink(mobile, receiptMessage),
      message: `Bill ${billNumber} saved${bill.saveToCrm ? ' and customer added to CRM' : ''}.`,
    });
  })
);

router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const bills = await db.collection('bills').find({}).sort({ createdAt: -1 }).toArray();
    const { q, page = 1, limit = 20 } = req.query;
    let filtered = bills;
    if (q) {
      const needle = String(q).toLowerCase();
      filtered = filtered.filter((bill) =>
        [bill.billNumber, bill.customer?.name, bill.customer?.mobile].join(' ').toLowerCase().includes(needle)
      );
    }
    res.json({ ...paginate(filtered, page, limit), totalRevenue: filtered.reduce((sum, bill) => sum + Number(bill.grandTotal || 0), 0) });
  })
);

router.get(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const bill = await db.collection('bills').findOne({ _id: req.params.id });
    if (!bill) throw httpError(404, 'Bill not found.');
    res.json({ bill });
  })
);

router.post(
  '/:id/receipt',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const settings = await getSettings(db);
    const bill = await db.collection('bills').findOne({ _id: req.params.id });
    if (!bill) throw httpError(404, 'Bill not found.');
    const message = `Dear ${bill.customer.name}, thank you for shopping at ${settings.shop.name}. Bill ${bill.billNumber}: ₹${bill.grandTotal}. Exchange within 7 days with this bill. — ${settings.shop.phone}`;
    const results = await notifyCustomer({ customer: bill.customer, message, channels: ['whatsapp'] });
    res.json({ results, whatsappLink: waLink(bill.customer.mobile, message), message: 'Receipt dispatched on WhatsApp.' });
  })
);

export default router;
