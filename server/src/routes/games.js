import { Router } from 'express';
import { getDb } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler, httpError } from '../middleware/error.js';
import { upsertCustomer } from '../services/crm.js';
import { getSettings } from '../services/settings.js';
import { makeCouponCode, newId } from '../utils/ids.js';
import { asNumber, isValidMobile, normalizeMobile } from '../utils/validate.js';

const router = Router();

const DAY = 24 * 60 * 60 * 1000;

export const SPIN_SEGMENTS = [
  { label: '5% OFF', type: 'percent', value: 5, applicableOn: 'all', weight: 20 },
  { label: '10% OFF', type: 'percent', value: 10, applicableOn: 'all', weight: 22 },
  { label: '15% OFF', type: 'percent', value: 15, applicableOn: 'all', weight: 16 },
  { label: '20% OFF', type: 'percent', value: 20, applicableOn: 'all', weight: 10 },
  { label: 'Free Alteration', type: 'offer', value: 0, applicableOn: 'all', weight: 12 },
  { label: 'Buy 2 Get 1 at 50%', type: 'offer', value: 50, applicableOn: 'all', weight: 8 },
  { label: '30% OFF Kurtas', type: 'percent', value: 30, applicableOn: 'kurtas', weight: 4 },
  { label: 'Try Again', type: 'none', value: 0, applicableOn: 'all', weight: 8 },
];

const QUIZ = [
  {
    id: 'q1',
    question: 'Which fabric is the most breathable choice for Lucknow summers?',
    options: ['Polyester', 'Linen', 'Wool', 'Velvet'],
    answer: 1,
  },
  {
    id: 'q2',
    question: 'What is the correct care step for a silk-blend sherwani?',
    options: ['Hot machine wash', 'Dry clean only', 'Bleach soak', 'Tumble dry high'],
    answer: 1,
  },
  {
    id: 'q3',
    question: 'Which fit is our tailor’s recommendation for a festive kurta?',
    options: ['Skin tight', 'Comfortable with room to move', 'Two sizes large', 'Crop length'],
    answer: 1,
  },
];

async function requireMobile(req) {
  const mobile = normalizeMobile(req.body?.mobile);
  if (!isValidMobile(mobile)) throw httpError(400, 'Enter a valid 10-digit mobile number to play.');
  return mobile;
}

async function recentPlay(db, mobile, game, windowMs) {
  const plays = await db.collection('gamePlays').find({ mobile, game }).sort({ createdAt: -1 }).toArray();
  const last = plays.find((play) => play.won);
  if (!last) return null;
  const elapsed = Date.now() - new Date(last.createdAt).getTime();
  return elapsed < windowMs ? new Date(new Date(last.createdAt).getTime() + windowMs).toISOString() : null;
}

async function recordPlay(db, mobile, game, won, extra = {}) {
  await db.collection('gamePlays').insertOne({
    _id: newId(),
    mobile,
    game,
    won,
    createdAt: new Date().toISOString(),
    ...extra,
  });
  await upsertCustomer(db, {
    mobile,
    source: 'game',
    tags: ['Game Player'],
    countOrder: false,
    note: `${game} played`,
  });
}

async function issueCoupon(db, { mobile, source, discountType, discountValue, applicableOn = 'all', validityHours, label }) {
  const settings = await getSettings(db);
  const coupon = {
    _id: newId(),
    code: makeCouponCode(source.toUpperCase()),
    discountType,
    discountValue,
    applicableOn,
    validUntil: new Date(Date.now() + validityHours * 60 * 60 * 1000).toISOString(),
    usedBy: mobile,
    isUsed: false,
    source,
    label,
    createdAt: new Date().toISOString(),
    shopName: settings.shop.name,
  };
  await db.collection('coupons').insertOne(coupon);
  return coupon;
}

router.get(
  '/segments',
  asyncHandler(async (_req, res) => {
    const db = await getDb();
    const settings = await getSettings(db);
    res.json({
      segments: SPIN_SEGMENTS.map(({ label, type, value }) => ({ label, type, value })),
      games: settings.games,
    });
  })
);

router.get(
  '/config',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const db = await getDb();
    const settings = await getSettings(db);
    res.json({ games: settings.games, segments: SPIN_SEGMENTS.map(({ label, type, value }) => ({ label, type, value })) });
  })
);

router.put(
  '/config',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const settings = await getSettings(db);
    const body = req.body || {};
    const clampPercent = (value, fallback) => {
      const number = asNumber(value, fallback);
      return Math.max(0, Math.min(100, number));
    };
    const games = {
      ...settings.games,
      spinEnabled: body.spinEnabled !== undefined ? Boolean(body.spinEnabled) : settings.games.spinEnabled,
      puzzleEnabled: body.puzzleEnabled !== undefined ? Boolean(body.puzzleEnabled) : settings.games.puzzleEnabled,
      quizEnabled: body.quizEnabled !== undefined ? Boolean(body.quizEnabled) : settings.games.quizEnabled,
      puzzleDiscount: clampPercent(body.puzzleDiscount, settings.games.puzzleDiscount),
      quizDiscount: clampPercent(body.quizDiscount, settings.games.quizDiscount),
      spinValidityHours: Math.max(1, asNumber(body.spinValidityHours, settings.games.spinValidityHours)),
      puzzleValidityHours: Math.max(1, asNumber(body.puzzleValidityHours, settings.games.puzzleValidityHours)),
      quizValidityHours: Math.max(1, asNumber(body.quizValidityHours, settings.games.quizValidityHours)),
      spinCooldownDays: Math.max(1, asNumber(body.spinCooldownDays, settings.games.spinCooldownDays)),
    };
    await db.collection('settings').updateOne(
      { _id: 'settings' },
      { $set: { games, updatedAt: new Date().toISOString() } }
    );
    res.json({ games, message: 'Game offers updated.' });
  })
);

router.post(
  '/spin',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const settings = await getSettings(db);
    if (settings.games?.spinEnabled === false) {
      return res.status(403).json({ error: 'The spin wheel is paused by the shop right now.' });
    }
    const mobile = await requireMobile(req);
    const cooldownDays = Math.max(1, Number(settings.games?.spinCooldownDays) || 7);
    const nextAvailable = await recentPlay(db, mobile, 'spin', cooldownDays * DAY);
    if (nextAvailable) {
      return res.status(429).json({ error: `You have already spun in the last ${cooldownDays} days.`, nextAvailableAt: nextAvailable });
    }

    const totalWeight = SPIN_SEGMENTS.reduce((sum, segment) => sum + segment.weight, 0);
    let roll = Math.random() * totalWeight;
    let index = 0;
    for (let i = 0; i < SPIN_SEGMENTS.length; i += 1) {
      roll -= SPIN_SEGMENTS[i].weight;
      if (roll <= 0) {
        index = i;
        break;
      }
    }
    const prize = SPIN_SEGMENTS[index];

    if (prize.type === 'none') {
      await recordPlay(db, mobile, 'spin', false, { prize: prize.label });
      return res.json({ won: false, index, prize: prize.label, message: 'Better luck next week! Visit the shop for in-store offers.' });
    }

    const coupon = await issueCoupon(db, {
      mobile,
      source: 'spin',
      discountType: prize.type === 'percent' ? 'percent' : 'offer',
      discountValue: prize.value,
      applicableOn: prize.applicableOn,
      validityHours: Math.max(1, Number(settings.games?.spinValidityHours) || 48),
      label: prize.label,
    });
    await recordPlay(db, mobile, 'spin', true, { prize: prize.label, couponCode: coupon.code });

    res.json({
      won: true,
      index,
      prize: prize.label,
      coupon,
      message: `You won ${prize.label}! Coupon ${coupon.code} is valid for ${Math.max(1, Number(settings.games?.spinValidityHours) || 48)} hours.`,
    });
  })
);

router.post(
  '/puzzle',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const settings = await getSettings(db);
    if (settings.games?.puzzleEnabled === false) {
      return res.status(403).json({ error: 'The puzzle game is paused by the shop right now.' });
    }
    const mobile = await requireMobile(req);
    const timeTaken = asNumber(req.body?.timeTaken, 0);
    if (timeTaken <= 0 || timeTaken > 120) {
      return res.status(400).json({ error: 'Puzzles must be solved within 2 minutes.' });
    }
    const nextAvailable = await recentPlay(db, mobile, 'puzzle', DAY);
    if (nextAvailable) {
      return res.status(429).json({ error: 'You already won a puzzle coupon today.', nextAvailableAt: nextAvailable });
    }

    const discount = Math.max(1, Number(settings.games?.puzzleDiscount) || 12);
    const validityHours = Math.max(1, Number(settings.games?.puzzleValidityHours) || 24);
    const coupon = await issueCoupon(db, {
      mobile,
      source: 'puzzle',
      discountType: 'percent',
      discountValue: discount,
      validityHours,
      label: `${discount}% OFF — Puzzle solved`,
    });
    await recordPlay(db, mobile, 'puzzle', true, { couponCode: coupon.code, timeTaken });
    res.json({
      won: true,
      coupon,
      message: `Puzzle solved in ${timeTaken}s. ${discount}% OFF coupon ${coupon.code} is yours for ${validityHours} hours.`,
    });
  })
);

router.get('/quiz', (_req, res) => {
  res.json({ questions: QUIZ.map(({ answer, ...question }) => question) });
});

router.post(
  '/quiz',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const settings = await getSettings(db);
    if (settings.games?.quizEnabled === false) {
      return res.status(403).json({ error: 'The quiz is paused by the shop right now.' });
    }
    const mobile = await requireMobile(req);
    const answers = Array.isArray(req.body?.answers) ? req.body.answers.map((value) => asNumber(value, -1)) : [];
    const correct = QUIZ.reduce((sum, question, index) => sum + (answers[index] === question.answer ? 1 : 0), 0);
    if (correct < QUIZ.length) {
      return res.json({ won: false, correct, total: QUIZ.length, message: 'Not all answers were right. Try again tomorrow!' });
    }
    const nextAvailable = await recentPlay(db, mobile, 'quiz', DAY);
    if (nextAvailable) {
      return res.status(429).json({ error: 'You already earned today’s quiz coupon.', nextAvailableAt: nextAvailable });
    }
    const discount = Math.max(1, Number(settings.games?.quizDiscount) || 10);
    const validityHours = Math.max(1, Number(settings.games?.quizValidityHours) || 24);
    const coupon = await issueCoupon(db, {
      mobile,
      source: 'quiz',
      discountType: 'percent',
      discountValue: discount,
      validityHours,
      label: `${discount}% OFF — Quiz champion`,
    });
    await recordPlay(db, mobile, 'quiz', true, { couponCode: coupon.code });
    res.json({
      won: true,
      coupon,
      correct,
      total: QUIZ.length,
      message: `All correct! ${discount}% OFF coupon ${coupon.code} is valid for ${validityHours} hours.`,
    });
  })
);

router.get(
  '/coupons',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const db = await getDb();
    const coupons = await db.collection('coupons').find({}).sort({ createdAt: -1 }).toArray();
    const plays = await db.collection('gamePlays').find({}).sort({ createdAt: -1 }).limit(50).toArray();
    res.json({ coupons, plays, total: coupons.length });
  })
);

export default router;
