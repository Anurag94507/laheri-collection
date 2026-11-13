import { Router } from 'express';
import { getDb } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler, httpError } from '../middleware/error.js';
import { notifyCustomer, waLink } from '../services/notify.js';
import { getSettings } from '../services/settings.js';
import { newId } from '../utils/ids.js';
import { asString } from '../utils/validate.js';

const router = Router();
const DAY = 24 * 60 * 60 * 1000;

function resolveAudience(customers, { audience = 'all', days = 90, tag = '' }) {
  const now = Date.now();
  const lastVisit = (customer) => (customer.lastVisit ? new Date(customer.lastVisit).getTime() : 0);
  const withMobile = customers.filter((customer) => String(customer.mobile || '').length >= 10);
  switch (audience) {
    case 'recent':
      return withMobile.filter((customer) => lastVisit(customer) && now - lastVisit(customer) <= Number(days) * DAY);
    case 'vip':
      return withMobile.filter((customer) => (customer.tags || []).includes('VIP') || Number(customer.totalSpend) >= 10000);
    case 'inactive':
      return withMobile.filter((customer) => !lastVisit(customer) || now - lastVisit(customer) > Number(days) * DAY);
    case 'tag':
      return withMobile.filter((customer) => (customer.tags || []).includes(tag));
    case 'accounts':
      return withMobile;
    case 'all':
    default:
      return withMobile;
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
      sample: recipients.slice(0, 5).map((customer) => ({
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
    const template = asString(req.body?.message);
    if (!template) throw httpError(400, 'Compose a WhatsApp message before sending.');

    const customers = await db.collection('customers').find({}).toArray();
    const recipients = resolveAudience(customers, req.body || {}).slice(0, 300);
    if (!recipients.length) throw httpError(400, 'No WhatsApp contacts match this audience.');

    const campaign = {
      _id: newId(),
      audience: req.body?.audience || 'all',
      audienceLabel: req.body?.audienceLabel || 'All customers',
      channels: ['whatsapp'],
      template,
      subject: `WhatsApp broadcast from ${settings.shop.name}`,
      recipientCount: recipients.length,
      sentCount: 0,
      failedCount: 0,
      status: 'sending',
      createdAt: new Date().toISOString(),
      createdBy: req.user?.username || 'admin',
      results: [],
    };

    let sent = 0;
    let failed = 0;
    const results = [];

    for (const customer of recipients) {
      const message = fillTemplate(template, customer, settings);
      const outcome = await notifyCustomer({ customer, message, channels: ['whatsapp'] });
      const ok = outcome.some((entry) => entry.status !== 'failed');
      if (ok) sent += 1;
      else failed += 1;
      if (results.length < 100) {
        results.push({
          name: customer.name,
          mobile: customer.mobile,
          status: ok ? 'sent' : 'failed',
          channels: outcome,
          previewLink: outcome.find((entry) => entry.link)?.link || waLink(customer.mobile, message),
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
      message: `WhatsApp campaign sent to ${sent} contact${sent === 1 ? '' : 's'}${failed ? `, ${failed} failed` : ''}.`,
      sent,
      failed,
    });
  })
);

/**
 * One-click WhatsApp broadcast: uses the shop's default festive message and
 * returns a ready-to-open wa.me link for every customer.
 */
router.post(
  '/send-all',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const settings = await getSettings(db);
    const template =
      asString(req.body?.message) ||
      `Namaste {name}! ${settings.offers?.title || 'New arrivals'} at ${settings.shop.name}. ${settings.offers?.subtitle || 'Walk in or order online.'}`;

    const customers = await db.collection('customers').find({}).toArray();
    const recipients = resolveAudience(customers, { audience: 'all' });
    if (!recipients.length) throw httpError(400, 'No customers with a mobile number yet.');

    const links = [];
    let sent = 0;
    for (const customer of recipients) {
      const message = fillTemplate(template, customer, settings);
      const outcome = await notifyCustomer({ customer, message, channels: ['whatsapp'] });
      if (outcome.some((entry) => entry.status !== 'failed')) sent += 1;
      links.push({
        name: customer.name,
        mobile: customer.mobile,
        link: outcome.find((entry) => entry.link)?.link || waLink(customer.mobile, message),
      });
    }

    await db.collection('campaigns').insertOne({
      _id: newId(),
      audience: 'all',
      audienceLabel: 'All customers · one click',
      channels: ['whatsapp'],
      template,
      subject: `One-click WhatsApp broadcast — ${settings.shop.name}`,
      recipientCount: recipients.length,
      sentCount: sent,
      failedCount: recipients.length - sent,
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      createdBy: req.user?.username || 'admin',
      results: links.slice(0, 100).map((entry) => ({
        name: entry.name,
        mobile: entry.mobile,
        status: 'sent',
        previewLink: entry.link,
        channels: [{ channel: 'whatsapp', status: 'simulated', link: entry.link }],
      })),
    });

    res.status(201).json({
      message: `Broadcast prepared for ${recipients.length} WhatsApp contacts.`,
      count: recipients.length,
      sent,
      links,
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
