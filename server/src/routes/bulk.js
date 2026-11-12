import { Router } from 'express';
import { getDb } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler, httpError } from '../middleware/error.js';
import { notifyCustomer } from '../services/notify.js';
import { getSettings } from '../services/settings.js';
import { newId } from '../utils/ids.js';
import { asString } from '../utils/validate.js';

const router = Router();
const DAY = 24 * 60 * 60 * 1000;

function resolveAudience(customers, { audience = 'all', days = 90, tag = '' }) {
  const now = Date.now();
  const lastVisit = (customer) => (customer.lastVisit ? new Date(customer.lastVisit).getTime() : 0);
  switch (audience) {
    case 'recent':
      return customers.filter((customer) => lastVisit(customer) && now - lastVisit(customer) <= Number(days) * DAY);
    case 'vip':
      return customers.filter((customer) => (customer.tags || []).includes('VIP') || Number(customer.totalSpend) >= 10000);
    case 'inactive':
      return customers.filter((customer) => !lastVisit(customer) || now - lastVisit(customer) > Number(days) * DAY);
    case 'tag':
      return customers.filter((customer) => (customer.tags || []).includes(tag));
    case 'all':
    default:
      return customers;
  }
}

function fillTemplate(template, customer, settings) {
  return String(template)
    .replaceAll('{name}', customer.name || 'ji')
    .replaceAll('{shop_name}', settings.shop.name)
    .replaceAll('{offer}', settings.offers?.title || 'our new collection')
    .replaceAll('{date}', new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }));
}

router.post(
  '/preview',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const settings = await getSettings(db);
    const customers = await db.collection('customers').find({}).toArray();
    const recipients = resolveAudience(customers, req.body || {});
    const message = fillTemplate(req.body?.message || 'Hello {name}, new arrivals at {shop_name}!', recipients[0] || {}, settings);
    res.json({
      count: recipients.length,
      sample: recipients.slice(0, 4).map((customer) => ({
        name: customer.name,
        mobile: `XXXXXX${String(customer.mobile).slice(-4)}`,
        lastVisit: customer.lastVisit,
      })),
      preview: message,
    });
  })
);

router.post(
  '/send',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const settings = await getSettings(db);
    const channels = (Array.isArray(req.body?.channels) ? req.body.channels : ['whatsapp']).filter((channel) =>
      ['whatsapp', 'sms', 'email'].includes(channel)
    );
    if (!channels.length) throw httpError(400, 'Choose at least one channel.');
    const template = asString(req.body?.message);
    if (!template) throw httpError(400, 'Compose a message before sending.');
    const subject = asString(req.body?.subject) || `A note from ${settings.shop.name}`;
    const scheduleAt = req.body?.scheduleAt ? new Date(req.body.scheduleAt) : null;

    const customers = await db.collection('customers').find({}).toArray();
    const recipients = resolveAudience(customers, req.body || {}).slice(0, 300);
    if (!recipients.length) throw httpError(400, 'No customers match this audience.');

    const campaign = {
      _id: newId(),
      audience: req.body?.audience || 'all',
      audienceLabel: req.body?.audienceLabel || 'All customers',
      channels,
      template,
      subject,
      recipientCount: recipients.length,
      sentCount: 0,
      failedCount: 0,
      status: 'sending',
      scheduledFor: scheduleAt && scheduleAt.getTime() > Date.now() ? scheduleAt.toISOString() : null,
      createdAt: new Date().toISOString(),
      createdBy: req.user?.username || 'admin',
      results: [],
    };

    if (campaign.scheduledFor) {
      campaign.status = 'scheduled';
      await db.collection('campaigns').insertOne(campaign);
      return res.status(201).json({
        campaign,
        message: `Campaign scheduled for ${scheduleAt.toLocaleString('en-IN')} — ${recipients.length} contacts.`,
        scheduled: true,
      });
    }

    let sent = 0;
    let failed = 0;
    const results = [];
    for (const customer of recipients) {
      const message = fillTemplate(template, customer, settings);
      const outcome = await notifyCustomer({ customer, message, subject, channels });
      const attempted = outcome.filter((entry) => entry.status !== 'failed');
      if (attempted.length) sent += 1;
      else failed += 1;
      if (results.length < 60) {
        results.push({
          name: customer.name,
          mobile: customer.mobile,
          status: failed ? 'failed' : 'sent',
          channels: outcome,
          previewLink: outcome.find((entry) => entry.link)?.link || '',
        });
      }
    }

    const updated = {
      ...campaign,
      sentCount: sent,
      failedCount: failed,
      status: failed && !sent ? 'failed' : 'completed',
      results,
      completedAt: new Date().toISOString(),
    };
    await db.collection('campaigns').insertOne(updated);

    res.status(201).json({
      campaign: updated,
      message: `Campaign sent to ${sent} contacts${failed ? `, ${failed} failed` : ''}.`,
      sent,
      failed,
    });
  })
);

router.get(
  '/logs',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const db = await getDb();
    const campaigns = await db.collection('campaigns').find({}).sort({ createdAt: -1 }).toArray();
    res.json({ campaigns, total: campaigns.length });
  })
);

export default router;
