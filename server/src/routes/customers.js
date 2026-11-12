import { Router } from 'express';
import { getDb } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler, httpError } from '../middleware/error.js';
import { upsertCustomer } from '../services/crm.js';
import { notifyCustomer } from '../services/notify.js';
import { newId } from '../utils/ids.js';
import {
  asString,
  cleanTags,
  isValidEmail,
  isValidMobile,
  normalizeMobile,
  paginate,
} from '../utils/validate.js';

const router = Router();

const INACTIVE_DAYS = 90;

function segmentMatches(customer, segment) {
  const lastVisit = customer.lastVisit ? new Date(customer.lastVisit).getTime() : 0;
  const inactive = !lastVisit || Date.now() - lastVisit > INACTIVE_DAYS * 24 * 60 * 60 * 1000;
  switch (segment) {
    case 'new':
      return Number(customer.totalOrders || 0) <= 1;
    case 'repeat':
      return Number(customer.totalOrders || 0) >= 2;
    case 'vip':
      return (customer.tags || []).includes('VIP') || Number(customer.totalSpend || 0) >= 10000;
    case 'inactive':
      return inactive;
    case 'high-spenders':
      return Number(customer.totalSpend || 0) >= 5000;
    default:
      return true;
  }
}

router.get(
  '/lookup',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const mobile = normalizeMobile(req.query.mobile);
    if (!isValidMobile(mobile)) return res.json({ found: false });
    const customer = await db.collection('customers').findOne({ mobile });
    if (!customer) return res.json({ found: false });
    res.json({
      found: true,
      customer: {
        name: customer.name,
        email: customer.email,
        city: customer.city,
        lastAddress: customer.lastAddress || null,
      },
    });
  })
);

router.get(
  '/export.csv',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const db = await getDb();
    const customers = await db.collection('customers').find({}).sort({ createdAt: -1 }).toArray();
    const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const header = ['Name', 'Mobile', 'Email', 'City', 'Total Orders', 'Total Spend', 'Last Visit', 'Tags', 'Sources', 'Notes'];
    const rows = customers.map((customer) =>
      [
        customer.name,
        customer.mobile,
        customer.email,
        customer.city,
        customer.totalOrders,
        customer.totalSpend,
        customer.lastVisit,
        (customer.tags || []).join(' | '),
        (customer.sources || []).join(' | '),
        customer.notes,
      ]
        .map(escape)
        .join(',')
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
    res.send([header.map(escape).join(','), ...rows].join('\n'));
  })
);

router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const customers = await db.collection('customers').find({}).sort({ createdAt: -1 }).toArray();
    const { q, segment = 'all', page = 1, limit = 25 } = req.query;

    let filtered = customers.filter((customer) => segmentMatches(customer, String(segment)));
    if (q) {
      const needle = String(q).toLowerCase();
      filtered = filtered.filter((customer) =>
        [customer.name, customer.mobile, customer.email, customer.city, ...(customer.tags || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle)
      );
    }

    const counts = {
      all: customers.length,
      new: customers.filter((customer) => segmentMatches(customer, 'new')).length,
      repeat: customers.filter((customer) => segmentMatches(customer, 'repeat')).length,
      vip: customers.filter((customer) => segmentMatches(customer, 'vip')).length,
      inactive: customers.filter((customer) => segmentMatches(customer, 'inactive')).length,
      'high-spenders': customers.filter((customer) => segmentMatches(customer, 'high-spenders')).length,
    };

    res.json({ ...paginate(filtered, page, limit), counts, totalContacts: customers.length });
  })
);

router.post(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const name = asString(req.body?.name);
    const mobile = normalizeMobile(req.body?.mobile);
    const email = asString(req.body?.email);
    if (name.length < 2) throw httpError(400, 'Customer name is required.');
    if (!isValidMobile(mobile)) throw httpError(400, 'Enter a valid 10-digit mobile number.');
    if (email && !isValidEmail(email)) throw httpError(400, 'Enter a valid email address.');

    const existing = await db.collection('customers').findOne({ mobile });
    if (existing) throw httpError(409, 'A contact with this mobile number already exists.');

    const now = new Date().toISOString();
    const customer = {
      _id: newId(),
      name,
      mobile,
      email,
      city: asString(req.body?.city),
      tags: cleanTags(req.body?.tags),
      sources: ['manual'],
      totalOrders: 0,
      totalSpend: 0,
      firstVisit: now,
      lastVisit: now,
      createdAt: now,
      notes: asString(req.body?.notes),
    };
    await db.collection('customers').insertOne(customer);
    res.status(201).json({ customer, message: `${name} added to CRM.` });
  })
);

router.put(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const existing = await db.collection('customers').findOne({ _id: req.params.id });
    if (!existing) throw httpError(404, 'Contact not found.');
    const update = {
      name: req.body?.name !== undefined ? asString(req.body.name) : existing.name,
      email: req.body?.email !== undefined ? asString(req.body.email) : existing.email,
      city: req.body?.city !== undefined ? asString(req.body.city) : existing.city,
      notes: req.body?.notes !== undefined ? asString(req.body.notes) : existing.notes,
      tags: req.body?.tags !== undefined ? cleanTags(req.body.tags) : existing.tags,
      updatedAt: new Date().toISOString(),
    };
    await db.collection('customers').updateOne({ _id: existing._id }, { $set: update });
    res.json({ customer: { ...existing, ...update }, message: 'Contact updated.' });
  })
);

router.post(
  '/:id/send',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const customer = await db.collection('customers').findOne({ _id: req.params.id });
    if (!customer) throw httpError(404, 'Contact not found.');
    const message = asString(req.body?.message);
    if (!message) throw httpError(400, 'Message is required.');
    const results = await notifyCustomer({
      customer,
      message,
      subject: asString(req.body?.subject),
      channels: Array.isArray(req.body?.channels) ? req.body.channels : ['whatsapp'],
    });
    res.json({ results, message: 'Message dispatched.' });
  })
);

router.post(
  '/remind-inactive',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const customers = await db.collection('customers').find({}).toArray();
    const inactive = customers.filter((customer) => segmentMatches(customer, 'inactive'));
    const message =
      asString(req.body?.message) ||
      'We miss you! Visit us this week for the new festive collection and a special in-store discount.';
    const results = [];
    for (const customer of inactive.slice(0, 50)) {
      results.push(await notifyCustomer({ customer, message, channels: ['whatsapp'] }));
    }
    res.json({ sentTo: results.length, results, message: `Re-engagement sent to ${results.length} contacts.` });
  })
);

export default router;
