import crypto from 'node:crypto';
import { Router } from 'express';
import { config } from '../config.js';
import { getDb } from '../db/index.js';
import {
  clearCustomerCookie,
  requireCustomer,
  setCustomerCookie,
  signCustomerToken,
} from '../middleware/auth.js';
import { asyncHandler, httpError } from '../middleware/error.js';
import { notifyCustomer } from '../services/notify.js';
import { getSettings } from '../services/settings.js';
import { newId } from '../utils/ids.js';
import {
  asString,
  isValidEmail,
  isValidMobile,
  normalizeMobile,
} from '../utils/validate.js';

const router = Router();
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/* ---------- helpers ---------- */

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
};

const verifyPassword = (password, stored) => {
  if (!stored || !stored.includes(':')) return false;
  const [salt, digest] = stored.split(':');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(derived, 'hex'));
  } catch {
    return false;
  }
};

const isEmail = (value) => String(value).includes('@');

function normalizeIdentifier(raw) {
  const value = asString(raw).trim().toLowerCase();
  if (!value) throw httpError(400, 'Enter your mobile number or email address.');
  if (isEmail(value)) {
    if (!isValidEmail(value)) throw httpError(400, 'Enter a valid email address.');
    return { identifier: value, type: 'email' };
  }
  const mobile = normalizeMobile(value);
  if (!isValidMobile(mobile)) throw httpError(400, 'Enter a valid 10-digit mobile number.');
  return { identifier: mobile, type: 'mobile' };
}

async function findAccount(db, identifier) {
  const byEmail = await db.collection('accounts').findOne({ email: identifier });
  if (byEmail) return byEmail;
  return db.collection('accounts').findOne({ mobile: identifier });
}

async function ensureAccount(db, identifier, type) {
  const existing = await findAccount(db, identifier);
  if (existing) return existing;
  const account = {
    _id: newId(),
    name: '',
    email: type === 'email' ? identifier : '',
    mobile: type === 'mobile' ? identifier : '',
    passwordHash: '',
    verified: false,
    createdAt: new Date().toISOString(),
  };
  await db.collection('accounts').insertOne(account);
  return account;
}

async function deliverOtp(db, { account, identifier, type, channel, code }) {
  const settings = await getSettings(db);
  const message =
    `Your ${settings.shop.name} verification code is ${code}. ` +
    `It expires in 5 minutes. Do not share this code with anyone.`;
  const results = await notifyCustomer({
    customer: { mobile: type === 'mobile' ? identifier : '', email: type === 'email' ? identifier : '' },
    message,
    subject: `${settings.shop.name} login code: ${code}`,
    channels: [channel === 'email' || type === 'email' ? 'email' : channel === 'sms' ? 'sms' : 'whatsapp'],
  });
  const delivered = results.find((entry) => entry.status === 'sent' || entry.status === 'simulated');
  return { delivered: Boolean(delivered), results, message };
}

const publicAccount = (account) => ({
  _id: account._id,
  name: account.name || '',
  email: account.email || '',
  mobile: account.mobile || '',
  hasPassword: Boolean(account.passwordHash),
  verified: Boolean(account.verified),
  createdAt: account.createdAt,
});

/* ---------- OTP login ---------- */

router.post(
  '/request-otp',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { identifier, type } = normalizeIdentifier(req.body?.identifier);
    const purpose = req.body?.purpose === 'reset' ? 'reset' : 'login';
    const requestedChannel = ['whatsapp', 'sms', 'email'].includes(req.body?.channel) ? req.body.channel : 'whatsapp';
    const channel = type === 'email' ? 'email' : requestedChannel === 'email' ? 'whatsapp' : requestedChannel;

    const account = await ensureAccount(db, identifier, type);
    if (purpose === 'reset' && !account.passwordHash) {
      throw httpError(400, 'No password is set on this account yet. Login with an OTP instead.');
    }

    // Cooldown: one OTP per identifier per 30 seconds.
    const recent = await db.collection('otps').find({ identifier, purpose }).sort({ createdAt: -1 }).toArray();
    const last = recent[0];
    if (last && Date.now() - new Date(last.createdAt).getTime() < 30 * 1000) {
      throw httpError(429, 'Please wait a few seconds before requesting another code.');
    }

    const code = String(crypto.randomInt(100000, 999999));
    const otp = {
      _id: newId(),
      identifier,
      type,
      purpose,
      channel,
      code,
      attempts: 0,
      expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      createdAt: new Date().toISOString(),
    };
    await db.collection('otps').insertOne(otp);

    const { delivered } = await deliverOtp(db, { account, identifier, type, channel, code });

    res.json({
      ok: true,
      identifier,
      type,
      channel,
      purpose,
      delivered,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      // Without Twilio/SMTP credentials the code cannot leave the server, so we
      // surface it locally to keep the login flow usable in development.
      devCode: config.isProduction ? undefined : code,
      message:
        channel === 'email'
          ? `A 6-digit code was sent to ${identifier}.`
          : `A 6-digit code was sent on ${channel === 'sms' ? 'SMS' : 'WhatsApp'} to ${identifier}.`,
    });
  })
);

async function consumeOtp(db, { identifier, purpose, code }) {
  const records = await db.collection('otps').find({ identifier, purpose }).sort({ createdAt: -1 }).toArray();
  const otp = records.find((entry) => !entry.usedAt && new Date(entry.expiresAt).getTime() > Date.now());
  if (!otp) throw httpError(400, 'This code has expired. Please request a new one.');
  if (otp.attempts >= MAX_ATTEMPTS) throw httpError(429, 'Too many wrong attempts. Request a fresh code.');
  if (String(code) !== String(otp.code)) {
    await db.collection('otps').updateOne({ _id: otp._id }, { $set: { attempts: otp.attempts + 1 } });
    throw httpError(400, 'That code is not correct. Please check and try again.');
  }
  await db.collection('otps').updateOne({ _id: otp._id }, { $set: { usedAt: new Date().toISOString() } });
  return otp;
}

router.post(
  '/verify-otp',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { identifier, type } = normalizeIdentifier(req.body?.identifier);
    const code = asString(req.body?.code).replace(/\s+/g, '');
    if (code.length !== 6) throw httpError(400, 'Enter the 6-digit code.');

    await consumeOtp(db, { identifier, purpose: 'login', code });

    const account = await ensureAccount(db, identifier, type);
    await db.collection('accounts').updateOne({ _id: account._id }, { $set: { verified: true, lastLoginAt: new Date().toISOString() } });

    const token = signCustomerToken(account._id);
    setCustomerCookie(res, token);
    res.json({ account: publicAccount({ ...account, verified: true }), token, message: 'Login successful.' });
  })
);

/* ---------- password login / reset ---------- */

router.post(
  '/login-password',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { identifier, type } = normalizeIdentifier(req.body?.identifier);
    const password = asString(req.body?.password);
    if (!password) throw httpError(400, 'Enter your password.');
    if (type !== 'email') throw httpError(400, 'Password login works with your email address only.');

    const account = await findAccount(db, identifier);
    if (!account || !verifyPassword(password, account.passwordHash)) {
      throw httpError(401, 'Email or password is incorrect.');
    }
    const token = signCustomerToken(account._id);
    setCustomerCookie(res, token);
    res.json({ account: publicAccount(account), token, message: 'Welcome back.' });
  })
);

router.post(
  '/set-password',
  requireCustomer,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const password = asString(req.body?.password);
    if (password.length < 6) throw httpError(400, 'Use at least 6 characters for your password.');
    const account = await db.collection('accounts').findOne({ _id: req.customerId });
    if (!account) throw httpError(404, 'Account not found.');
    if (!account.email) throw httpError(400, 'Add an email address to your profile before setting a password.');
    await db.collection('accounts').updateOne({ _id: account._id }, { $set: { passwordHash: hashPassword(password) } });
    res.json({ ok: true, message: 'Password saved. You can now login with email and password.' });
  })
);

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { identifier, type } = normalizeIdentifier(req.body?.identifier);
    const code = asString(req.body?.code).replace(/\s+/g, '');
    const password = asString(req.body?.password);
    if (password.length < 6) throw httpError(400, 'Use at least 6 characters for your new password.');
    if (code.length !== 6) throw httpError(400, 'Enter the 6-digit code.');

    await consumeOtp(db, { identifier, purpose: 'reset', code });
    const account = await findAccount(db, identifier);
    if (!account) throw httpError(404, 'Account not found.');
    await db.collection('accounts').updateOne({ _id: account._id }, { $set: { passwordHash: hashPassword(password) } });
    res.json({ ok: true, message: 'Password updated. Please login with your new password.' });
  })
);

/* ---------- session / profile ---------- */

router.get(
  '/me',
  requireCustomer,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const account = await db.collection('accounts').findOne({ _id: req.customerId });
    if (!account) throw httpError(401, 'Account not found. Please login again.');
    const customer = account.mobile ? await db.collection('customers').findOne({ mobile: account.mobile }) : null;
    res.json({
      account: {
        ...publicAccount(account),
        name: account.name || customer?.name || '',
        city: customer?.city || '',
        lastAddress: customer?.lastAddress || null,
      },
    });
  })
);

router.put(
  '/profile',
  requireCustomer,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const account = await db.collection('accounts').findOne({ _id: req.customerId });
    if (!account) throw httpError(404, 'Account not found.');
    const name = asString(req.body?.name);
    const email = asString(req.body?.email).toLowerCase();
    if (email && !isValidEmail(email)) throw httpError(400, 'Enter a valid email address.');
    const duplicate = email ? await db.collection('accounts').findOne({ email }) : null;
    if (duplicate && duplicate._id !== account._id) throw httpError(409, 'That email is already used by another account.');

    const patch = { name, email, updatedAt: new Date().toISOString() };
    await db.collection('accounts').updateOne({ _id: account._id }, { $set: patch });
    if (account.mobile) {
      const customer = await db.collection('customers').findOne({ mobile: account.mobile });
      if (customer) {
        await db.collection('customers').updateOne(
          { _id: customer._id },
          { $set: { name: name || customer.name, email: email || customer.email } }
        );
      }
    }
    res.json({ account: publicAccount({ ...account, ...patch }), message: 'Profile updated.' });
  })
);

router.post('/logout', (req, res) => {
  clearCustomerCookie(res);
  res.json({ ok: true });
});

/* ---------- bag ---------- */

router.get(
  '/bag',
  requireCustomer,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const bag = await db.collection('bags').findOne({ _id: req.customerId });
    res.json({ items: bag?.items || [], couponCode: bag?.couponCode || '', updatedAt: bag?.updatedAt || null });
  })
);

router.put(
  '/bag',
  requireCustomer,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const items = Array.isArray(req.body?.items)
      ? req.body.items.slice(0, 50).map((item) => ({
          key: asString(item.key),
          productId: asString(item.productId),
          name: asString(item.name),
          price: Number(item.price) || 0,
          image: asString(item.image),
          category: asString(item.category),
          size: asString(item.size),
          quantity: Math.max(1, Math.min(Number(item.quantity) || 1, 10)),
        }))
      : [];
    const couponCode = asString(req.body?.couponCode).toUpperCase();
    const existing = await db.collection('bags').findOne({ _id: req.customerId });
    const doc = { items, couponCode, updatedAt: new Date().toISOString() };
    if (existing) await db.collection('bags').updateOne({ _id: req.customerId }, { $set: doc });
    else await db.collection('bags').insertOne({ _id: req.customerId, ...doc });
    res.json({ ok: true, items, couponCode, updatedAt: doc.updatedAt });
  })
);

/* ---------- my orders ---------- */

router.get(
  '/orders',
  requireCustomer,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const account = await db.collection('accounts').findOne({ _id: req.customerId });
    if (!account) throw httpError(401, 'Account not found.');

    const all = await db.collection('orders').find({}).sort({ createdAt: -1 }).toArray();
    const mine = all.filter((order) => {
      if (order.accountId && order.accountId === account._id) return true;
      if (account.mobile && order.customer?.mobile === account.mobile) return true;
      if (account.email && order.customer?.email && order.customer.email.toLowerCase() === account.email.toLowerCase()) return true;
      return false;
    });

    const bills = await db.collection('bills').find({}).sort({ createdAt: -1 }).toArray();
    const myBills = bills.filter((bill) => {
      if (account.mobile && bill.customer?.mobile === account.mobile) return true;
      if (account.email && bill.customer?.email && bill.customer.email.toLowerCase() === account.email.toLowerCase()) return true;
      return false;
    });

    res.json({
      orders: mine.slice(0, 25),
      bills: myBills.slice(0, 15),
      total: mine.length,
    });
  })
);

export default router;
