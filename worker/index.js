import { SEED_CATEGORIES, SEED_CUSTOMERS, SEED_PRODUCTS, SEED_SETTINGS } from './seed-data.js';

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
const fail = (status, message) => json({ error: message }, status);

const newId = () =>
  (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

const round = (value) => Math.round(Number(value || 0) * 100) / 100;
const digits = (value) => String(value || '').replace(/\D/g, '').slice(-10);
const isMobile = (value) => /^[6-9]\d{9}$/.test(digits(value));
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
const nowIso = () => new Date().toISOString();

const enc = new TextEncoder();

const b64url = (bytes) => {
  let binary = '';
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64urlDecode = (value) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};
const hex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signToken(payload, secret) {
  const header = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(signature)}`;
}

async function verifyToken(token, secret) {
  try {
    const [header, body, signature] = String(token || '').split('.');
    if (!header || !body || !signature) return null;
    const ok = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      b64urlDecode(signature),
      enc.encode(`${header}.${body}`)
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function hashPassword(password) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  return `pbkdf2$100000$${salt}$${hex(bits)}`;
}

async function checkPassword(password, stored) {
  try {
    const [scheme, iterations, salt, digest] = String(stored || '').split('$');
    if (scheme !== 'pbkdf2') return false;
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(salt), iterations: Number(iterations), hash: 'SHA-256' },
      key,
      256
    );
    return hex(bits) === digest;
  } catch {
    return false;
  }
}

function readCookies(request) {
  const header = request.headers.get('cookie') || '';
  const jar = {};
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name) jar[name] = decodeURIComponent(rest.join('='));
  }
  return jar;
}

const cookie = (name, value, maxAge) =>
  `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
const clearCookie = (name) => `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

const SECRET = (env) => env.JWT_SECRET || 'laheri-collection-worker-secret';

async function authUser(request, env) {
  const token = readCookies(request).laheri_token;
  const payload = token ? await verifyToken(token, SECRET(env)) : null;
  return payload?.role === 'admin' ? { username: payload.sub, role: 'admin' } : null;
}

async function authCustomer(request, env) {
  const token = readCookies(request).laheri_customer;
  const payload = token ? await verifyToken(token, SECRET(env)) : null;
  return payload?.role === 'customer' ? payload.sub : null;
}

/* ------------------------------------------------------------------ */
/* D1 document store                                                   */
/* ------------------------------------------------------------------ */

let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.batch([
    env.DB.prepare(
      'CREATE TABLE IF NOT EXISTS docs (collection TEXT NOT NULL, id TEXT NOT NULL, json TEXT NOT NULL, PRIMARY KEY (collection, id))'
    ),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)'),
  ]);
  schemaReady = true;
}

async function seed(env) {
  await ensureSchema(env);
  const existing = await env.DB.prepare("SELECT v FROM meta WHERE k = 'seed'").first();
  if (existing) return;

  const statements = [];
  const push = (collection, doc) =>
    statements.push(
      env.DB.prepare('INSERT OR REPLACE INTO docs (collection, id, json) VALUES (?, ?, ?)').bind(
        collection,
        doc._id,
        JSON.stringify(doc)
      )
    );

  for (const product of SEED_PRODUCTS) push('products', product);
  for (const category of SEED_CATEGORIES) push('categories', category);
  for (const customer of SEED_CUSTOMERS) push('customers', customer);
  push('settings', { ...SEED_SETTINGS, _id: 'settings' });

  statements.push(env.DB.prepare("INSERT OR REPLACE INTO meta (k, v) VALUES ('seed', '1')"));
  await env.DB.batch(statements);
}

const listDocs = async (env, collection) => {
  const result = await env.DB.prepare('SELECT json FROM docs WHERE collection = ?').bind(collection).all();
  return (result.results || []).map((row) => JSON.parse(row.json));
};
const getDoc = async (env, collection, id) => {
  const row = await env.DB.prepare('SELECT json FROM docs WHERE collection = ? AND id = ?').bind(collection, id).first();
  return row ? JSON.parse(row.json) : null;
};
const putDoc = async (env, collection, doc) => {
  await env.DB.prepare('INSERT OR REPLACE INTO docs (collection, id, json) VALUES (?, ?, ?)')
    .bind(collection, doc._id, JSON.stringify(doc))
    .run();
  return doc;
};
const deleteDoc = async (env, collection, id) => {
  await env.DB.prepare('DELETE FROM docs WHERE collection = ? AND id = ?').bind(collection, id).run();
};

/* ------------------------------------------------------------------ */
/* settings + catalog                                                  */
/* ------------------------------------------------------------------ */

const DEFAULT_GAMES = {
  spinEnabled: true,
  puzzleEnabled: true,
  quizEnabled: true,
  puzzleDiscount: 12,
  quizDiscount: 10,
  spinValidityHours: 48,
  puzzleValidityHours: 24,
  quizValidityHours: 24,
  spinCooldownDays: 7,
};

async function readSettings(env) {
  const stored = await getDoc(env, 'settings', 'settings');
  const base = { ...SEED_SETTINGS, games: DEFAULT_GAMES };
  if (!stored) return base;
  return {
    ...base,
    ...stored,
    shop: { ...base.shop, ...(stored.shop || {}) },
    social: { ...base.social, ...(stored.social || {}) },
    offers: { ...base.offers, ...(stored.offers || {}) },
    shipping: { ...base.shipping, ...(stored.shipping || {}) },
    chatbot: { ...base.chatbot, ...(stored.chatbot || {}) },
    games: { ...base.games, ...(stored.games || {}) },
    categories: stored.categories || base.categories,
    testimonials: stored.testimonials || base.testimonials,
  };
}

const publicSettings = (settings) => ({
  shop: settings.shop,
  social: settings.social,
  offers: settings.offers,
  shipping: settings.shipping,
  games: settings.games,
  chatbot: { enabled: settings.chatbot?.enabled !== false, welcome: settings.chatbot?.welcome, extraNotes: settings.chatbot?.extraNotes },
  testimonials: settings.testimonials,
  categories: settings.categories,
});

const effectivePrice = (product) =>
  Number(product.discountPrice) > 0 ? Number(product.discountPrice) : Number(product.price);
const discountPercent = (product) =>
  Number(product.discountPrice) > 0
    ? Math.round(((Number(product.price) - Number(product.discountPrice)) / Number(product.price)) * 100)
    : 0;
const decorate = (product) => ({
  ...product,
  effectivePrice: effectivePrice(product),
  discountPercent: discountPercent(product),
});

async function productsList(env, params) {
  const products = await listDocs(env, 'products');
  const category = params.get('category');
  const q = params.get('q');
  const minPrice = params.get('minPrice');
  const maxPrice = params.get('maxPrice');
  const size = params.get('size');
  const fabric = params.get('fabric');
  const color = params.get('color');
  const sort = params.get('sort') || 'newest';
  const page = Math.max(1, Number(params.get('page') || 1));
  const limit = Math.max(1, Math.min(200, Number(params.get('limit') || 12)));

  let filtered = products;
  if (category && category !== 'All') {
    filtered =
      category === 'Sale'
        ? filtered.filter((product) => discountPercent(product) > 0)
        : filtered.filter((product) => product.category === category);
  }
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((product) =>
      [product.name, product.description, product.fabric, product.category, ...(product.tags || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }
  if (minPrice) filtered = filtered.filter((product) => effectivePrice(product) >= Number(minPrice));
  if (maxPrice) filtered = filtered.filter((product) => effectivePrice(product) <= Number(maxPrice));
  if (size) filtered = filtered.filter((product) => (product.sizes || []).includes(size));
  if (fabric) filtered = filtered.filter((product) => product.fabric === fabric);
  if (color) filtered = filtered.filter((product) => (product.colors || []).some((c) => c.toLowerCase() === color.toLowerCase()));
  if (params.get('featured') === 'true') filtered = filtered.filter((product) => product.isFeatured);
  if (params.get('newArrival') === 'true') filtered = filtered.filter((product) => product.isNewArrival);
  if (params.get('sale') === 'true') filtered = filtered.filter((product) => discountPercent(product) > 0);

  const sorted = [...filtered];
  if (sort === 'price-asc') sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
  else if (sort === 'price-desc') sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
  else if (sort === 'bestselling') sorted.sort((a, b) => (b.reviewCount || 0) * (b.rating || 0) - (a.reviewCount || 0) * (a.rating || 0));
  else if (sort === 'discount') sorted.sort((a, b) => discountPercent(b) - discountPercent(a));
  else sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const items = sorted.slice((page - 1) * limit, page * limit).map(decorate);

  const facets = {
    categories: [...new Set(products.map((product) => product.category))].sort(),
    fabrics: [...new Set(products.map((product) => product.fabric).filter(Boolean))].sort(),
    colors: [...new Set(products.flatMap((product) => product.colors || []))].sort(),
    sizes: ['S', 'M', 'L', 'XL', 'XXL'].filter((option) => products.some((product) => (product.sizes || []).includes(option))),
    priceRange: {
      min: Math.min(...products.map(effectivePrice), 0),
      max: Math.max(...products.map(effectivePrice), 5000),
    },
  };

  return { items, total, page, pages, facets };
}

/* ------------------------------------------------------------------ */
/* pricing                                                             */
/* ------------------------------------------------------------------ */

const APPLICABILITY = { kurtas: ['Kurta', 'Festive Special'], formal: ['Formal Shirt'] };

function computeTotals({ items = [], coupon = null, gstPercent = 5, extraDiscount = 0, deliveryCharge = 0 }) {
  const subtotal = round(items.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0));
  let couponDiscount = 0;
  if (coupon) {
    const allowed = APPLICABILITY[coupon.applicableOn];
    const applicable = !coupon.applicableOn || coupon.applicableOn === 'all' || !allowed
      ? items
      : items.filter((item) => allowed.includes(item.category));
    const base = round(applicable.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0));
    if (coupon.discountType === 'percent') couponDiscount = round((base * Number(coupon.discountValue || 0)) / 100);
    else if (coupon.discountType === 'flat') couponDiscount = Math.min(Number(coupon.discountValue || 0), base);
  }
  const discount = Math.min(round(couponDiscount + Number(extraDiscount || 0)), subtotal);
  const taxable = round(subtotal - discount);
  const gstAmount = round((taxable * Number(gstPercent || 0)) / 100);
  const grandTotal = round(taxable + gstAmount + Number(deliveryCharge || 0));
  return { subtotal, discount, taxable, gstPercent: Number(gstPercent || 0), gstAmount, deliveryCharge: round(deliveryCharge), grandTotal };
}

async function resolveCoupon(env, { code, mobile, items = [] }) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return { coupon: null, message: '' };
  const coupons = await listDocs(env, 'coupons');
  const coupon = coupons.find((entry) => entry.code === clean);
  if (!coupon) throw { status: 400, message: 'That coupon code does not exist.' };
  if (coupon.isUsed) throw { status: 400, message: 'This coupon has already been used.' };
  if (coupon.validUntil && new Date(coupon.validUntil).getTime() < Date.now())
    throw { status: 400, message: 'This coupon has expired. Play again for a fresh one.' };
  if (coupon.usedBy && mobile && digits(coupon.usedBy) !== digits(mobile))
    throw { status: 400, message: 'This coupon is linked to a different mobile number.' };
  const preview = computeTotals({ items, coupon, gstPercent: 0 });
  if (preview.discount <= 0) throw { status: 400, message: 'This coupon does not apply to the items in your bag.' };
  return { coupon, message: `${coupon.code} applied — you saved ₹${preview.discount}` };
}

const waLink = (mobile, message) => `https://wa.me/91${digits(mobile)}?text=${encodeURIComponent(message)}`;

/* ------------------------------------------------------------------ */
/* chatbot                                                             */
/* ------------------------------------------------------------------ */

function chatReply(message, settings) {
  const text = String(message || '').toLowerCase();
  const shop = settings.shop;
  const has = (...words) => words.some((word) => text.includes(word));

  if (!text.trim()) return 'Kuch bhi poochhiye — size, fabric, delivery ya offers.';
  if (has('hello', 'hi ', 'hey', 'namaste', 'namaskar', 'salaam'))
    return `Namaste! ${shop.name} mein aapka swagat hai. Kurta, sherwani, formal shirts aur festive wear available hai. Kya dekhna chahenge?`;
  if (has('time', 'timing', 'open', 'band', 'khul'))
    return `Shop timings: ${(shop.hours || []).map((slot) => `${slot.days} ${slot.time}`).join(', ')}. Address: ${shop.address}.`;
  if (has('address', 'location', 'kahan', 'where', 'shop'))
    return `Hamari shop ${shop.address}, ${shop.city} - ${shop.pincode} par hai. Google Maps: ${shop.mapsLink}`;
  if (has('sherwani', 'wedding', 'shaadi', 'groom'))
    return 'Wedding aur sangeet ke liye sherwani ₹4,999 se shuru hai — ivory, maroon, indigo aur sage shades stock mein hain. Free alteration 3 din mein.';
  if (has('kurta', 'festive'))
    return 'Kurtas ₹999 se ₹2,999 tak — cotton, linen aur chikankari. Festive rack par flat 20% off chal raha hai.';
  if (has('price', 'kitna', 'rate', 'cost', 'budget'))
    return 'Budget ke hisaab se: kurtas ₹999+, formal shirts ₹1,299+, sherwani ₹4,999+. Sale section mein 30% tak off hai.';
  if (has('alter', 'fitting', 'fit', 'size'))
    return 'Alteration free hai aur 2–3 din mein ready hoti hai. Size guide product page par available hai — S se XXL tak.';
  if (has('deliver', 'shipping', 'courier', 'kab tak'))
    return `Delivery ${settings.shipping.deliveryDays} mein hoti hai. ₹${settings.shipping.freeAbove} se upar free delivery. Store pickup 2 ghante mein ready.`;
  if (has('payment', 'upi', 'card', 'cod', 'cash'))
    return 'Payment: UPI, debit/credit card, net banking aur COD. Shop par cash bhi chalega.';
  if (has('offer', 'discount', 'coupon', 'code'))
    return `Chal raha offer: ${settings.offers?.title || 'festive sale'} — code ${settings.offers?.code || 'FESTIVE20'}. Spin wheel aur puzzle khel kar bhi coupon jeet sakte hain.`;
  if (has('return', 'exchange', 'refund'))
    return 'Exchange 7 din ke andar bill ke saath. Sale items final sale hain.';
  if (has('order', 'track', 'status'))
    return 'Order track karne ke liye order ID daaliye "Track order" page par. WhatsApp par bhi update milta hai.';
  if (has('contact', 'phone', 'whatsapp', 'call'))
    return `Call ya WhatsApp: ${shop.phone}. Email: ${shop.email}.`;
  return `Main ${shop.name} ka assistant hoon. Aap poochh sakte hain: kurta/sherwani collection, price, size, alteration, delivery, offers ya shop ka address.`;
}

/* ------------------------------------------------------------------ */
/* game config                                                         */
/* ------------------------------------------------------------------ */

const SPIN_SEGMENTS = [
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
  { id: 'q1', question: 'Which fabric is the most breathable choice for Indian summers?', options: ['Polyester', 'Linen', 'Wool', 'Velvet'], answer: 1 },
  { id: 'q2', question: 'What is the correct care step for a silk-blend sherwani?', options: ['Hot machine wash', 'Dry clean only', 'Bleach soak', 'Tumble dry high'], answer: 1 },
  { id: 'q3', question: 'Which fit does our tailor recommend for a festive kurta?', options: ['Skin tight', 'Comfortable with room to move', 'Two sizes large', 'Crop length'], answer: 1 },
];

const codePart = () => Math.random().toString(36).slice(2, 6).toUpperCase();

async function recentPlay(env, mobile, game, windowMs) {
  const plays = (await listDocs(env, 'gamePlays')).filter((play) => play.mobile === mobile && play.game === game && play.won);
  if (!plays.length) return null;
  const latest = plays.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const elapsed = Date.now() - new Date(latest.createdAt).getTime();
  return elapsed < windowMs ? new Date(new Date(latest.createdAt).getTime() + windowMs).toISOString() : null;
}

async function issueCoupon(env, { mobile, source, discountType, discountValue, applicableOn = 'all', validityHours, label }) {
  const coupon = {
    _id: newId(),
    code: `${source.toUpperCase()}-${codePart()}`,
    discountType,
    discountValue,
    applicableOn,
    validUntil: new Date(Date.now() + validityHours * 3600 * 1000).toISOString(),
    usedBy: mobile,
    isUsed: false,
    source,
    label,
    createdAt: nowIso(),
  };
  return putDoc(env, 'coupons', coupon);
}

async function recordPlay(env, mobile, game, won, extra = {}) {
  await putDoc(env, 'gamePlays', { _id: newId(), mobile, game, won, createdAt: nowIso(), ...extra });
  const customers = await listDocs(env, 'customers');
  const existing = customers.find((customer) => customer.mobile === mobile);
  if (!existing) {
    await putDoc(env, 'customers', {
      _id: newId(),
      name: '',
      mobile,
      email: '',
      city: '',
      tags: ['Game Player'],
      sources: ['game'],
      totalOrders: 0,
      totalSpend: 0,
      lastVisit: nowIso(),
      createdAt: nowIso(),
      notes: `${game} played`,
    });
  }
}

/* ------------------------------------------------------------------ */
/* response builders                                                   */
/* ------------------------------------------------------------------ */

function dashboard({ bills, orders, customers, products, campaigns, chatLogs, settings }) {
  const dayKey = (date) => new Date(date).toISOString().slice(0, 10);
  const today = dayKey(new Date());
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const startOfDay = (offset) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return date;
  };
  const revenue = (doc) => Number(doc.grandTotal || 0);
  const all = [...bills, ...orders];

  const weeklyRevenue = Array.from({ length: 7 }).map((_, index) => {
    const date = startOfDay(index - 6);
    const key = dayKey(date);
    return {
      day: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: key,
      total: round(all.filter((doc) => dayKey(doc.createdAt) === key).reduce((sum, doc) => sum + revenue(doc), 0)),
    };
  });

  const categoryTotals = {};
  for (const doc of all) {
    for (const item of doc.items || []) {
      const key = item.category || 'Other';
      categoryTotals[key] = (categoryTotals[key] || 0) + Number(item.totalPrice || 0);
    }
  }

  const acquisition = Array.from({ length: 8 }).map((_, index) => {
    const end = startOfDay((index - 7) * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    return {
      label: `W${8 - index}`,
      count: customers.filter((customer) => customer.createdAt >= start.toISOString() && customer.createdAt < end.toISOString()).length,
    };
  });

  const recent = [
    ...bills.map((bill) => ({ id: bill._id, kind: 'Offline bill', reference: bill.billNumber, name: bill.customer?.name || 'Walk-in', amount: bill.grandTotal, createdAt: bill.createdAt })),
    ...orders.map((order) => ({ id: order._id, kind: 'Online order', reference: order.orderId, name: order.customer?.name || 'Guest', amount: order.grandTotal, createdAt: order.createdAt })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  return {
    stats: {
      todaySales: round(all.filter((doc) => dayKey(doc.createdAt) === today).reduce((sum, doc) => sum + revenue(doc), 0)),
      todayBillCount: bills.filter((bill) => dayKey(bill.createdAt) === today).length,
      todayOrderCount: orders.filter((order) => dayKey(order.createdAt) === today).length,
      monthOrders: orders.filter((order) => order.createdAt >= monthStart).length,
      monthRevenue: round(all.filter((doc) => doc.createdAt >= monthStart).reduce((sum, doc) => sum + revenue(doc), 0)),
      newCustomersWeek: customers.filter((customer) => customer.createdAt >= startOfDay(-6).toISOString()).length,
      totalCustomers: customers.length,
      lowStockCount: products.filter((product) => Number(product.stock) < 5).length,
      messagesThisMonth: campaigns.filter((campaign) => campaign.createdAt >= monthStart).reduce((sum, campaign) => sum + Number(campaign.sentCount || 0), 0),
      chatbotToday: new Set(chatLogs.filter((log) => dayKey(log.createdAt) === today).map((log) => log.sessionId)).size,
      gstPercent: settings.shop.gstPercent,
    },
    weeklyRevenue,
    categorySales: Object.entries(categoryTotals).map(([name, total]) => ({ name, total: round(total) })).sort((a, b) => b.total - a.total),
    acquisition,
    lowStock: products
      .filter((product) => Number(product.stock) < 5)
      .sort((a, b) => Number(a.stock) - Number(b.stock))
      .slice(0, 6)
      .map((product) => ({ id: product._id, name: product.name, stock: product.stock, image: product.images?.[0] })),
    recent,
  };
}

/* ------------------------------------------------------------------ */
/* router                                                              */
/* ------------------------------------------------------------------ */

async function handleApi(request, env, url) {
  const { pathname } = url;
  const method = request.method.toUpperCase();
  const segments = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const [root, ...rest] = segments;

  const body = async () => {
    try {
      return await request.json();
    } catch {
      return {};
    }
  };

  await seed(env);
  const settings = await readSettings(env);

  /* ---- health ---- */
  if (root === 'health') return json({ ok: true, service: 'laheri-collection', time: nowIso() });

  /* ---- settings ---- */
  if (root === 'settings' && !rest.length) {
    if (method === 'GET') return json({ settings: publicSettings(settings) });
    if (method === 'PUT') {
      if (!(await authUser(request, env))) return fail(401, 'Login required.');
      const patch = await body();
      const allowed = ['shop', 'social', 'offers', 'shipping', 'chatbot', 'testimonials', 'categories'];
      const next = { ...(await getDoc(env, 'settings', 'settings')) || { _id: 'settings' } };
      for (const key of allowed) {
        if (patch[key] === undefined) continue;
        next[key] = Array.isArray(patch[key]) ? patch[key] : { ...(next[key] || {}), ...patch[key] };
      }
      next.updatedAt = nowIso();
      await putDoc(env, 'settings', { ...next, _id: 'settings' });
      return json({ settings: publicSettings(await readSettings(env)), message: 'Shop settings saved.' });
    }
  }
  if (root === 'settings' && rest[0] === 'offers' && method === 'GET') {
    return json({ offers: settings.offers, shop: { name: settings.shop.name, phone: settings.shop.phone } });
  }

  /* ---- products ---- */
  if (root === 'products') {
    if (!rest.length && method === 'GET') return json(await productsList(env, url.searchParams));
    if (!rest.length && method === 'POST') {
      if (!(await authUser(request, env))) return fail(401, 'Login required.');
      const input = await body();
      const product = {
        _id: newId(),
        name: String(input.name || '').trim(),
        slug: String(input.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        description: input.description || '',
        category: input.category || 'Kurta',
        subcategory: input.subcategory || '',
        price: Number(input.price) || 0,
        discountPrice: Number(input.discountPrice) || 0,
        sizes: input.sizes || ['S', 'M', 'L', 'XL', 'XXL'],
        colors: input.colors || [],
        stock: Number(input.stock) || 0,
        images: input.images?.length ? input.images : ['/images/products/kurta-royal.svg'],
        fabric: input.fabric || '',
        tags: input.tags || [],
        isFeatured: Boolean(input.isFeatured),
        isNewArrival: input.isNewArrival !== false,
        rating: Number(input.rating) || 4.5,
        reviewCount: Number(input.reviewCount) || 0,
        washCare: input.washCare || 'Gentle machine wash or dry clean.',
        createdAt: nowIso(),
      };
      if (!product.name) return fail(400, 'Product name is required.');
      if (product.price <= 0) return fail(400, 'Price must be greater than zero.');
      await putDoc(env, 'products', product);
      return json({ product: decorate(product), message: `${product.name} added to the catalogue.` }, 201);
    }
    if (rest[0] === 'categories' && method === 'GET') {
      const products = await listDocs(env, 'products');
      const categories = (await listDocs(env, 'categories')).filter((category) => category.active !== false);
      const base = categories.map((category) => ({
        ...category,
        count: products.filter((product) => product.category === category.name).length,
        image: products.find((product) => product.category === category.name)?.images?.[0] || category.image,
      }));
      for (const name of new Set(products.map((product) => product.category))) {
        if (!base.some((entry) => entry.name === name)) {
          base.push({
            name,
            blurb: 'Explore the range',
            count: products.filter((product) => product.category === name).length,
            image: products.find((product) => product.category === name)?.images?.[0],
          });
        }
      }
      base.push({ name: 'Sale', blurb: 'Last pieces, best prices', count: products.filter((product) => discountPercent(product) > 0).length, image: '/images/products/sale.svg' });
      return json({ categories: base });
    }
    if (rest.length === 1 && rest[0] !== 'categories') {
      const product = await getDoc(env, 'products', rest[0]);
      if (!product) return fail(404, 'Product not found.');
      if (method === 'GET') {
        const related = (await listDocs(env, 'products'))
          .filter((entry) => entry.category === product.category && entry._id !== product._id)
          .slice(0, 4)
          .map(decorate);
        return json({ product: decorate(product), related });
      }
      if (!(await authUser(request, env))) return fail(401, 'Login required.');
      if (method === 'PUT') {
        const input = await body();
        const updated = { ...product, ...input, _id: product._id, updatedAt: nowIso() };
        await putDoc(env, 'products', updated);
        return json({ product: decorate(updated), message: 'Product updated.' });
      }
      if (method === 'DELETE') {
        await deleteDoc(env, 'products', product._id);
        return json({ ok: true, message: 'Product removed from catalogue.' });
      }
    }
  }

  /* ---- categories ---- */
  if (root === 'categories') {
    if (!rest.length && method === 'GET') {
      const products = await listDocs(env, 'products');
      const categories = (await listDocs(env, 'categories'))
        .filter((category) => category.active !== false)
        .map((category) => ({ ...category, count: products.filter((product) => product.category === category.name).length }));
      return json({ categories });
    }
    const user = await authUser(request, env);
    if (!user) return fail(401, 'Login required.');
    if (rest[0] === 'admin' && method === 'GET') {
      const products = await listDocs(env, 'products');
      const categories = (await listDocs(env, 'categories'))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((category) => ({ ...category, count: products.filter((product) => product.category === category.name).length }));
      return json({ categories });
    }
    if (!rest.length && method === 'POST') {
      const input = await body();
      const name = String(input.name || '').trim();
      if (!name) return fail(400, 'Category name is required.');
      const categories = await listDocs(env, 'categories');
      if (categories.some((category) => category.name === name)) return fail(409, 'That category already exists.');
      const category = { _id: newId(), name, blurb: input.blurb || 'Explore the range', image: input.image || '/images/products/kurta-royal.svg', active: input.active !== false, createdAt: nowIso() };
      await putDoc(env, 'categories', category);
      return json({ category, message: `${name} added.` }, 201);
    }
    if (rest.length === 1) {
      const existing = await getDoc(env, 'categories', rest[0]);
      if (!existing) return fail(404, 'Category not found.');
      if (method === 'PUT') {
        const input = await body();
        const updated = { ...existing, ...input, _id: existing._id, updatedAt: nowIso() };
        if (updated.name !== existing.name) {
          const products = (await listDocs(env, 'products')).filter((product) => product.category === existing.name);
          for (const product of products) await putDoc(env, 'products', { ...product, category: updated.name });
        }
        await putDoc(env, 'categories', updated);
        return json({ category: updated, message: 'Category updated.' });
      }
      if (method === 'DELETE') {
        const products = await listDocs(env, 'products');
        const inUse = products.filter((product) => product.category === existing.name).length;
        if (inUse) return fail(400, `${inUse} product(s) still use "${existing.name}". Move them first.`);
        await deleteDoc(env, 'categories', existing._id);
        return json({ ok: true, message: `${existing.name} removed.` });
      }
    }
  }

  /* ---- auth (admin) ---- */
  if (root === 'auth') {
    if (rest[0] === 'login' && method === 'POST') {
      const input = await body();
      const username = env.ADMIN_USERNAME || 'admin';
      const password = env.ADMIN_PASSWORD || 'shop12345';
      if (String(input.username || '').trim() !== username || String(input.password || '') !== password)
        return fail(401, 'Invalid username or password.');
      const token = await signToken(
        { sub: username, role: 'admin', exp: Math.floor(Date.now() / 1000) + 86400 },
        SECRET(env)
      );
      return json({ user: { username, role: 'admin' }, token }, 200, { 'set-cookie': cookie('laheri_token', token, 86400) });
    }
    if (rest[0] === 'me' && method === 'GET') {
      const user = await authUser(request, env);
      return user ? json({ user }) : fail(401, 'Login required.');
    }
    if (rest[0] === 'logout') {
      return json({ ok: true }, 200, { 'set-cookie': clearCookie('laheri_token') });
    }
  }

  /* ---- customer account ---- */
  if (root === 'account') {
    const action = rest[0];

    if (action === 'request-otp' && method === 'POST') {
      const input = await body();
      const raw = String(input.identifier || '').trim().toLowerCase();
      const emailMode = raw.includes('@');
      if (emailMode && !isEmail(raw)) return fail(400, 'Enter a valid email address.');
      if (!emailMode && !isMobile(raw)) return fail(400, 'Enter a valid 10-digit mobile number.');
      const identifier = emailMode ? raw : digits(raw);
      const purpose = input.purpose === 'reset' ? 'reset' : 'login';
      const channel = emailMode ? 'email' : ['whatsapp', 'sms'].includes(input.channel) ? input.channel : 'whatsapp';

      const accounts = await listDocs(env, 'accounts');
      let account = accounts.find((entry) => (emailMode ? entry.email === identifier : entry.mobile === identifier));
      if (!account) {
        account = {
          _id: newId(),
          name: '',
          email: emailMode ? identifier : '',
          mobile: emailMode ? '' : identifier,
          passwordHash: '',
          verified: false,
          createdAt: nowIso(),
        };
        await putDoc(env, 'accounts', account);
      }
      if (purpose === 'reset' && !account.passwordHash)
        return fail(400, 'No password is set on this account yet. Login with an OTP instead.');

      const otps = await listDocs(env, 'otps');
      const last = otps
        .filter((entry) => entry.identifier === identifier && entry.purpose === purpose)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      if (last && Date.now() - new Date(last.createdAt).getTime() < 30000)
        return fail(429, 'Please wait a few seconds before requesting another code.');

      const code = String(Math.floor(100000 + Math.random() * 900000));
      await putDoc(env, 'otps', {
        _id: newId(),
        identifier,
        type: emailMode ? 'email' : 'mobile',
        purpose,
        channel,
        code,
        attempts: 0,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        createdAt: nowIso(),
      });

      return json({
        ok: true,
        identifier,
        type: emailMode ? 'email' : 'mobile',
        channel,
        purpose,
        delivered: true,
        expiresInSeconds: 300,
        // No SMS/SMTP provider is connected to the hosted build, so the code is
        // shown here to keep login usable. Connect Twilio/SMTP to hide it.
        devCode: env.HIDE_OTP === 'true' ? undefined : code,
        message: `A 6-digit code was sent to ${identifier}.`,
      });
    }

    if (action === 'verify-otp' && method === 'POST') {
      const input = await body();
      const raw = String(input.identifier || '').trim().toLowerCase();
      const emailMode = raw.includes('@');
      const identifier = emailMode ? raw : digits(raw);
      const code = String(input.code || '').replace(/\s+/g, '');
      if (code.length !== 6) return fail(400, 'Enter the 6-digit code.');

      const otps = await listDocs(env, 'otps');
      const otp = otps
        .filter((entry) => entry.identifier === identifier && entry.purpose === 'login' && !entry.usedAt)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .find((entry) => new Date(entry.expiresAt).getTime() > Date.now());
      if (!otp) return fail(400, 'This code has expired. Please request a new one.');
      if (otp.attempts >= 5) return fail(429, 'Too many wrong attempts. Request a fresh code.');
      if (String(code) !== String(otp.code)) {
        await putDoc(env, 'otps', { ...otp, attempts: (otp.attempts || 0) + 1 });
        return fail(400, 'That code is not correct. Please check and try again.');
      }
      await putDoc(env, 'otps', { ...otp, usedAt: nowIso() });

      const accounts = await listDocs(env, 'accounts');
      const account = accounts.find((entry) => (emailMode ? entry.email === identifier : entry.mobile === identifier));
      if (!account) return fail(400, 'Account not found. Request a new code.');
      const updated = { ...account, verified: true, lastLoginAt: nowIso() };
      await putDoc(env, 'accounts', updated);

      const token = await signToken(
        { sub: account._id, role: 'customer', exp: Math.floor(Date.now() / 1000) + 30 * 86400 },
        SECRET(env)
      );
      return json(
        { account: { _id: account._id, name: account.name, email: account.email, mobile: account.mobile, hasPassword: Boolean(account.passwordHash), verified: true, createdAt: account.createdAt }, token, message: 'Login successful.' },
        200,
        { 'set-cookie': cookie('laheri_customer', token, 30 * 86400) }
      );
    }

    if (action === 'login-password' && method === 'POST') {
      const input = await body();
      const email = String(input.identifier || '').trim().toLowerCase();
      if (!isEmail(email)) return fail(400, 'Password login works with your email address only.');
      const accounts = await listDocs(env, 'accounts');
      const account = accounts.find((entry) => entry.email === email);
      if (!account || !(await checkPassword(String(input.password || ''), account.passwordHash)))
        return fail(401, 'Email or password is incorrect.');
      const token = await signToken(
        { sub: account._id, role: 'customer', exp: Math.floor(Date.now() / 1000) + 30 * 86400 },
        SECRET(env)
      );
      return json(
        { account: { _id: account._id, name: account.name, email: account.email, mobile: account.mobile, hasPassword: true, verified: account.verified, createdAt: account.createdAt }, token, message: 'Welcome back.' },
        200,
        { 'set-cookie': cookie('laheri_customer', token, 30 * 86400) }
      );
    }

    if (action === 'reset-password' && method === 'POST') {
      const input = await body();
      const raw = String(input.identifier || '').trim().toLowerCase();
      const emailMode = raw.includes('@');
      const identifier = emailMode ? raw : digits(raw);
      const code = String(input.code || '').replace(/\s+/g, '');
      const password = String(input.password || '');
      if (password.length < 6) return fail(400, 'Use at least 6 characters for your new password.');

      const otps = await listDocs(env, 'otps');
      const otp = otps
        .filter((entry) => entry.identifier === identifier && entry.purpose === 'reset' && !entry.usedAt)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .find((entry) => new Date(entry.expiresAt).getTime() > Date.now());
      if (!otp || String(code) !== String(otp.code)) return fail(400, 'That reset code is not valid.');
      await putDoc(env, 'otps', { ...otp, usedAt: nowIso() });

      const accounts = await listDocs(env, 'accounts');
      const account = accounts.find((entry) => (emailMode ? entry.email === identifier : entry.mobile === identifier));
      if (!account) return fail(404, 'Account not found.');
      await putDoc(env, 'accounts', { ...account, passwordHash: await hashPassword(password) });
      return json({ ok: true, message: 'Password updated. Please login with your new password.' });
    }

    const customerId = await authCustomer(request, env);
    if (!customerId) return fail(401, 'Please login with your mobile or email to continue.');
    const account = await getDoc(env, 'accounts', customerId);
    if (!account) return fail(401, 'Account not found. Please login again.');

    if (action === 'me' && method === 'GET') {
      const customer = account.mobile ? (await listDocs(env, 'customers')).find((entry) => entry.mobile === account.mobile) : null;
      return json({
        account: {
          _id: account._id,
          name: account.name || customer?.name || '',
          email: account.email || '',
          mobile: account.mobile || '',
          hasPassword: Boolean(account.passwordHash),
          verified: Boolean(account.verified),
          createdAt: account.createdAt,
          city: customer?.city || '',
          lastAddress: customer?.lastAddress || null,
        },
      });
    }

    if (action === 'profile' && method === 'PUT') {
      const input = await body();
      const email = String(input.email || '').trim().toLowerCase();
      if (email && !isEmail(email)) return fail(400, 'Enter a valid email address.');
      const accounts = await listDocs(env, 'accounts');
      if (email && accounts.some((entry) => entry.email === email && entry._id !== account._id))
        return fail(409, 'That email is already used by another account.');
      const updated = { ...account, name: String(input.name || ''), email, updatedAt: nowIso() };
      await putDoc(env, 'accounts', updated);
      if (account.mobile) {
        const customer = (await listDocs(env, 'customers')).find((entry) => entry.mobile === account.mobile);
        if (customer) {
          await putDoc(env, 'customers', { ...customer, name: updated.name || customer.name, email: email || customer.email });
        }
      }
      return json({ account: { _id: updated._id, name: updated.name, email: updated.email, mobile: updated.mobile, hasPassword: Boolean(updated.passwordHash), createdAt: updated.createdAt }, message: 'Profile updated.' });
    }

    if (action === 'set-password' && method === 'POST') {
      const input = await body();
      if (String(input.password || '').length < 6) return fail(400, 'Use at least 6 characters for your password.');
      if (!account.email) return fail(400, 'Add an email address to your profile before setting a password.');
      await putDoc(env, 'accounts', { ...account, passwordHash: await hashPassword(String(input.password)) });
      return json({ ok: true, message: 'Password saved. You can now login with email and password.' });
    }

    if (action === 'logout') {
      return json({ ok: true }, 200, { 'set-cookie': clearCookie('laheri_customer') });
    }

    if (action === 'bag') {
      if (method === 'GET') {
        const bag = await getDoc(env, 'bags', customerId);
        return json({ items: bag?.items || [], couponCode: bag?.couponCode || '', updatedAt: bag?.updatedAt || null });
      }
      if (method === 'PUT') {
        const input = await body();
        const items = Array.isArray(input.items)
          ? input.items.slice(0, 50).map((item) => ({
              key: String(item.key || ''),
              productId: String(item.productId || ''),
              name: String(item.name || ''),
              price: Number(item.price) || 0,
              image: String(item.image || ''),
              category: String(item.category || ''),
              size: String(item.size || ''),
              quantity: Math.max(1, Math.min(Number(item.quantity) || 1, 10)),
            }))
          : [];
        const bag = { _id: customerId, items, couponCode: String(input.couponCode || '').toUpperCase(), updatedAt: nowIso() };
        await putDoc(env, 'bags', bag);
        return json({ ok: true, items, couponCode: bag.couponCode, updatedAt: bag.updatedAt });
      }
    }

    if (action === 'orders' && method === 'GET') {
      const orders = (await listDocs(env, 'orders'))
        .filter(
          (order) =>
            order.accountId === account._id ||
            (account.mobile && order.customer?.mobile === account.mobile) ||
            (account.email && order.customer?.email?.toLowerCase() === account.email.toLowerCase())
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const bills = (await listDocs(env, 'bills')).filter(
        (bill) =>
          (account.mobile && bill.customer?.mobile === account.mobile) ||
          (account.email && bill.customer?.email?.toLowerCase() === account.email.toLowerCase())
      );
      return json({ orders: orders.slice(0, 25), bills: bills.slice(0, 15), total: orders.length });
    }
  }

  /* ---- coupons ---- */
  if (root === 'coupons') {
    if (rest[0] === 'validate' && method === 'POST') {
      const input = await body();
      const items = Array.isArray(input.items) ? input.items : [];
      if (!items.length) return fail(400, 'Add items to the cart before applying a coupon.');
      const normalized = items.map((item) => ({
        category: item.category,
        unitPrice: Number(item.unitPrice || 0),
        quantity: Number(item.quantity || 1),
      }));
      try {
        const { coupon, message } = await resolveCoupon(env, { code: input.code, mobile: input.mobile, items: normalized });
        const preview = computeTotals({ items: normalized, coupon, gstPercent: 0 });
        return json({
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
      } catch (error) {
        return fail(error.status || 400, error.message || 'Coupon could not be applied.');
      }
    }
    if (!(await authUser(request, env))) return fail(401, 'Login required.');
    const q = String(url.searchParams.get('q') || '').toLowerCase();
    let coupons = (await listDocs(env, 'coupons')).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (q) coupons = coupons.filter((coupon) => [coupon.code, coupon.usedBy, coupon.source].join(' ').toLowerCase().includes(q));
    return json({ coupons, total: coupons.length });
  }

  /* ---- customers ---- */
  if (root === 'customers') {
    if (rest[0] === 'lookup' && method === 'GET') {
      const mobile = digits(url.searchParams.get('mobile'));
      const customer = (await listDocs(env, 'customers')).find((entry) => entry.mobile === mobile);
      if (!customer) return json({ found: false });
      return json({ found: true, customer: { name: customer.name, email: customer.email, city: customer.city, lastAddress: customer.lastAddress || null } });
    }
    if (!(await authUser(request, env))) return fail(401, 'Login required.');
    if (rest[0] === 'export.csv') {
      const customers = await listDocs(env, 'customers');
      const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
      const header = ['Name', 'Mobile', 'Email', 'City', 'Total Orders', 'Total Spend', 'Last Visit', 'Tags', 'Sources', 'Notes'];
      const rows = customers.map((customer) =>
        [customer.name, customer.mobile, customer.email, customer.city, customer.totalOrders, customer.totalSpend, customer.lastVisit, (customer.tags || []).join(' | '), (customer.sources || []).join(' | '), customer.notes]
          .map(escape)
          .join(',')
      );
      return new Response([header.map(escape).join(','), ...rows].join('\n'), {
        headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="customers.csv"' },
      });
    }
    if (rest.length === 1 && method === 'PUT') {
      const existing = await getDoc(env, 'customers', rest[0]);
      if (!existing) return fail(404, 'Customer not found.');
      const updated = { ...existing, ...(await body()), _id: existing._id };
      await putDoc(env, 'customers', updated);
      return json({ customer: updated, message: 'Contact updated.' });
    }
    if (!rest.length && method === 'POST') {
      const input = await body();
      const mobile = digits(input.mobile);
      if (!isMobile(mobile)) return fail(400, 'Enter a valid 10-digit mobile number.');
      const existing = (await listDocs(env, 'customers')).find((entry) => entry.mobile === mobile);
      if (existing) return fail(409, 'A customer with that mobile already exists.');
      const customer = { _id: newId(), name: input.name || '', mobile, email: input.email || '', city: input.city || '', tags: input.tags || [], sources: ['manual'], totalOrders: 0, totalSpend: 0, lastVisit: nowIso(), createdAt: nowIso(), notes: '', lastAddress: null };
      await putDoc(env, 'customers', customer);
      return json({ customer, message: 'Customer added.' }, 201);
    }
    if (!rest.length && method === 'GET') {
      const customers = (await listDocs(env, 'customers')).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      const q = String(url.searchParams.get('q') || '').toLowerCase();
      const segment = url.searchParams.get('segment') || 'all';
      const inactive = (customer) => !customer.lastVisit || Date.now() - new Date(customer.lastVisit).getTime() > 90 * 86400000;
      const matches = (customer) => {
        if (segment === 'new') return Number(customer.totalOrders || 0) <= 1;
        if (segment === 'repeat') return Number(customer.totalOrders || 0) >= 2;
        if (segment === 'vip') return (customer.tags || []).includes('VIP') || Number(customer.totalSpend || 0) >= 10000;
        if (segment === 'inactive') return inactive(customer);
        if (segment === 'high-spenders') return Number(customer.totalSpend || 0) >= 5000;
        return true;
      };
      const counts = {
        all: customers.length,
        new: customers.filter((c) => Number(c.totalOrders || 0) <= 1).length,
        repeat: customers.filter((c) => Number(c.totalOrders || 0) >= 2).length,
        vip: customers.filter((c) => (c.tags || []).includes('VIP') || Number(c.totalSpend || 0) >= 10000).length,
        inactive: customers.filter(inactive).length,
        'high-spenders': customers.filter((c) => Number(c.totalSpend || 0) >= 5000).length,
      };
      let filtered = customers.filter(matches);
      if (q) filtered = filtered.filter((customer) => [customer.name, customer.mobile, customer.email].join(' ').toLowerCase().includes(q));
      return json({ items: filtered, total: filtered.length, page: 1, pages: 1, counts, totalContacts: customers.length });
    }
  }

  /* ---- orders ---- */
  if (root === 'orders') {
    if (rest[0] === 'track' && rest[1] && method === 'GET') {
      const order = (await listDocs(env, 'orders')).find((entry) => entry.orderId === String(rest[1]).toUpperCase());
      if (!order) return fail(404, 'No order found with that ID. Please check and try again.');
      return json({
        order: {
          orderId: order.orderId,
          status: order.status,
          timeline: order.timeline,
          items: order.items,
          subtotal: order.subtotal,
          discount: order.discount,
          gstAmount: order.gstAmount,
          deliveryCharge: order.deliveryCharge,
          grandTotal: order.grandTotal,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          delivery: order.delivery,
          createdAt: order.createdAt,
          customer: { name: order.customer?.name, maskedMobile: order.customer?.maskedMobile, city: order.customer?.city },
        },
      });
    }
    if (!rest.length && method === 'POST') {
      const input = await body();
      const accountId = await authCustomer(request, env);
      const customerInput = input.customer || {};
      const name = String(customerInput.name || '').trim();
      const mobile = digits(customerInput.mobile);
      const email = String(customerInput.email || '').trim();
      if (name.length < 2) return fail(400, 'Please enter your full name.');
      if (!isMobile(mobile)) return fail(400, 'Enter a valid 10-digit Indian mobile number.');

      const deliveryType = input.delivery?.type === 'pickup' ? 'pickup' : 'home';
      const address = String(input.delivery?.address || '');
      const pincode = String(input.delivery?.pincode || '');
      if (deliveryType === 'home') {
        if (address.length < 8) return fail(400, 'Please enter a complete delivery address.');
        if (!/^[1-9]\d{5}$/.test(pincode)) return fail(400, 'Enter a valid 6-digit pincode.');
      }
      const itemsInput = Array.isArray(input.items) ? input.items : [];
      if (!itemsInput.length) return fail(400, 'Your cart is empty.');

      const products = await listDocs(env, 'products');
      const items = [];
      for (const raw of itemsInput) {
        const product = products.find((entry) => entry._id === String(raw.productId));
        if (!product) return fail(400, 'One of the items in your bag is no longer available.');
        const quantity = Math.max(1, Math.min(Number(raw.quantity) || 1, 10));
        if (Number(product.stock) < quantity) return fail(400, `Only ${product.stock} left in ${product.name}. Please adjust the quantity.`);
        const unitPrice = effectivePrice(product);
        items.push({
          productId: product._id,
          productName: product.name,
          category: product.category,
          size: String(raw.size || product.sizes?.[0] || 'M'),
          quantity,
          unitPrice: round(unitPrice),
          totalPrice: round(unitPrice * quantity),
          image: product.images?.[0] || '',
        });
      }

      let coupon = null;
      try {
        const resolved = await resolveCoupon(env, { code: input.couponCode, mobile, items });
        coupon = resolved.coupon;
      } catch (error) {
        return fail(error.status || 400, error.message);
      }

      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const deliveryCharge =
        deliveryType === 'home' && subtotal < Number(settings.shipping.freeAbove || 0)
          ? Number(settings.shipping.deliveryCharge || 0)
          : 0;
      const totals = computeTotals({ items, coupon, gstPercent: settings.shop.gstPercent, deliveryCharge });
      const paymentMethod = ['upi', 'card', 'netbanking', 'cod'].includes(input.paymentMethod) ? input.paymentMethod : 'cod';
      const orderId = `ORD-${new Date().getFullYear()}-${Math.floor(1200 + Math.random() * 700)}`;
      const createdAt = nowIso();

      const order = {
        _id: newId(),
        orderId,
        accountId: accountId || null,
        customer: {
          name,
          mobile,
          email,
          maskedMobile: `XXXXXX${mobile.slice(-4)}`,
          address: deliveryType === 'home' ? address : settings.shop.address,
          landmark: String(input.delivery?.landmark || ''),
          city: String(input.delivery?.city || settings.shop.city),
          pincode,
        },
        delivery: {
          type: deliveryType,
          address,
          landmark: String(input.delivery?.landmark || ''),
          city: String(input.delivery?.city || settings.shop.city),
          pincode,
          charge: deliveryCharge,
          expected: deliveryType === 'pickup' ? settings.shipping.pickupNote : settings.shipping.deliveryDays,
        },
        items,
        ...totals,
        coupon: coupon ? { code: coupon.code, discount: totals.discount } : null,
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
        status: 'placed',
        timeline: [{ status: 'placed', at: createdAt, note: 'Order received on the website' }],
        notes: String(input.notes || ''),
        source: 'online',
        createdAt,
      };

      await putDoc(env, 'orders', order);
      for (const item of items) {
        const product = products.find((entry) => entry._id === item.productId);
        if (product) await putDoc(env, 'products', { ...product, stock: Math.max(0, Number(product.stock) - item.quantity) });
      }
      if (coupon) await putDoc(env, 'coupons', { ...coupon, isUsed: true, usedAt: createdAt, usedOn: orderId });

      const customers = await listDocs(env, 'customers');
      const existing = customers.find((customer) => customer.mobile === mobile);
      const customerDoc = existing || { _id: newId(), mobile, sources: [], tags: [], totalOrders: 0, totalSpend: 0 };
      await putDoc(env, 'customers', {
        ...customerDoc,
        name,
        email: email || customerDoc.email || '',
        city: order.customer.city,
        sources: [...new Set([...(customerDoc.sources || []), 'online'])],
        totalOrders: Number(customerDoc.totalOrders || 0) + 1,
        totalSpend: round(Number(customerDoc.totalSpend || 0) + totals.grandTotal),
        lastVisit: createdAt,
        createdAt: customerDoc.createdAt || createdAt,
        tags: [...new Set([...(customerDoc.tags || []), ...(totals.grandTotal >= 5000 ? ['VIP'] : [])])],
      });

      return json({
        order,
        message: 'Order placed successfully.',
        whatsappLink: waLink(mobile, `Dear ${name}, your order #${orderId} has been confirmed at ${settings.shop.name}. We'll dispatch it soon! — ${settings.shop.phone}`),
      }, 201);
    }
    if (!(await authUser(request, env))) return fail(401, 'Login required.');
    if (rest.length === 2 && rest[1] === 'status' && method === 'PUT') {
      const order = await getDoc(env, 'orders', rest[0]);
      if (!order) return fail(404, 'Order not found.');
      const input = await body();
      const status = String(input.status || '').toLowerCase();
      if (!['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'].includes(status))
        return fail(400, 'Unknown order status.');
      const updated = {
        ...order,
        status,
        timeline: [...(order.timeline || []), { status, at: nowIso(), note: `Marked ${status} by shop` }],
        updatedAt: nowIso(),
      };
      await putDoc(env, 'orders', updated);
      return json({ order: updated, message: `Order marked ${status}.` });
    }
    if (!rest.length && method === 'GET') {
      const orders = (await listDocs(env, 'orders')).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const status = url.searchParams.get('status');
      const q = String(url.searchParams.get('q') || '').toLowerCase();
      let filtered = orders;
      if (status && status !== 'all') filtered = filtered.filter((order) => order.status === status);
      if (q) filtered = filtered.filter((order) => [order.orderId, order.customer?.name, order.customer?.mobile].join(' ').toLowerCase().includes(q));
      const counts = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'].reduce(
        (acc, key) => ({ ...acc, [key]: orders.filter((order) => order.status === key).length }),
        {}
      );
      return json({ items: filtered, total: filtered.length, page: 1, pages: 1, counts });
    }
  }

  /* ---- bills ---- */
  if (root === 'bills') {
    if (!(await authUser(request, env))) return fail(401, 'Login required.');
    if (!rest.length && method === 'GET') {
      const bills = (await listDocs(env, 'bills')).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const q = String(url.searchParams.get('q') || '').toLowerCase();
      const filtered = q
        ? bills.filter((bill) => [bill.billNumber, bill.customer?.name, bill.customer?.mobile].join(' ').toLowerCase().includes(q))
        : bills;
      return json({ items: filtered, total: filtered.length, page: 1, pages: 1, totalRevenue: round(filtered.reduce((sum, bill) => sum + Number(bill.grandTotal || 0), 0)) });
    }
    if (!rest.length && method === 'POST') {
      const input = await body();
      const customerInput = input.customer || {};
      const name = String(customerInput.name || '').trim();
      const mobile = digits(customerInput.mobile);
      if (!name) return fail(400, 'Customer name is required for a bill.');
      if (!isMobile(mobile)) return fail(400, 'Enter a valid 10-digit mobile number.');
      const rawItems = Array.isArray(input.items) ? input.items : [];
      if (!rawItems.length) return fail(400, 'Add at least one item to the bill.');

      const products = await listDocs(env, 'products');
      const items = [];
      for (const raw of rawItems) {
        const quantity = Math.max(1, Math.min(Number(raw.quantity) || 1, 99));
        const product = raw.productId ? products.find((entry) => entry._id === String(raw.productId)) : null;
        const productName = product?.name || String(raw.productName || '');
        if (!productName) return fail(400, 'Every bill line needs a product name.');
        let unitPrice = Number(raw.unitPrice) || 0;
        if (!unitPrice && product) unitPrice = effectivePrice(product);
        if (unitPrice <= 0) return fail(400, `Enter a price for ${productName}.`);
        items.push({
          productId: product?._id || null,
          productName,
          category: product?.category || String(raw.category || 'In-store'),
          size: String(raw.size || product?.sizes?.[0] || 'Free Size'),
          quantity,
          unitPrice: round(unitPrice),
          totalPrice: round(unitPrice * quantity),
        });
      }

      const gstPercent = input.gstPercent !== undefined ? Number(input.gstPercent) : settings.shop.gstPercent;
      const totals = computeTotals({ items, gstPercent, extraDiscount: Number(input.extraDiscount || input.discount || 0) });
      const paymentMethod = ['cash', 'upi', 'card'].includes(input.paymentMethod) ? input.paymentMethod : 'cash';
      const bills = await listDocs(env, 'bills');
      const billNumber = `BILL-${new Date().getFullYear()}-${String(bills.length + 1).padStart(3, '0')}`;
      const createdAt = nowIso();

      const bill = {
        _id: newId(),
        billNumber,
        customer: { name, mobile, email: String(customerInput.email || '') },
        items,
        ...totals,
        paymentMethod,
        saveToCrm: input.saveToCrm !== false,
        billType: 'offline',
        notes: String(input.notes || ''),
        createdBy: 'admin',
        createdAt,
      };
      await putDoc(env, 'bills', bill);
      for (const item of items) {
        const product = products.find((entry) => entry._id === item.productId);
        if (product) await putDoc(env, 'products', { ...product, stock: Math.max(0, Number(product.stock) - item.quantity) });
      }
      if (bill.saveToCrm) {
        const customers = await listDocs(env, 'customers');
        const existing = customers.find((customer) => customer.mobile === mobile);
        const customerDoc = existing || { _id: newId(), mobile, sources: [], tags: [], totalOrders: 0, totalSpend: 0 };
        await putDoc(env, 'customers', {
          ...customerDoc,
          name,
          email: bill.customer.email || customerDoc.email || '',
          city: settings.shop.city,
          sources: [...new Set([...(customerDoc.sources || []), 'offline'])],
          totalOrders: Number(customerDoc.totalOrders || 0) + 1,
          totalSpend: round(Number(customerDoc.totalSpend || 0) + totals.grandTotal),
          lastVisit: createdAt,
          createdAt: customerDoc.createdAt || createdAt,
          tags: [...new Set([...(customerDoc.tags || []), ...(totals.grandTotal >= 5000 ? ['VIP'] : ['Walk-in'])])],
        });
      }

      const message = `Dear ${name}, thank you for shopping at ${settings.shop.name}. Bill ${billNumber}: ₹${totals.grandTotal} (${paymentMethod.toUpperCase()}). Exchange within 7 days with this bill. — ${settings.shop.phone}`;
      return json({ bill, whatsappLink: waLink(mobile, message), message: `Bill ${billNumber} saved${bill.saveToCrm ? ' and customer added to CRM' : ''}.` }, 201);
    }
    if (rest.length === 1 && method === 'GET') {
      const bill = await getDoc(env, 'bills', rest[0]);
      return bill ? json({ bill }) : fail(404, 'Bill not found.');
    }
    if (rest.length === 2 && rest[1] === 'receipt' && method === 'POST') {
      const bill = await getDoc(env, 'bills', rest[0]);
      if (!bill) return fail(404, 'Bill not found.');
      const message = `Dear ${bill.customer.name}, thank you for shopping at ${settings.shop.name}. Bill ${bill.billNumber}: ₹${bill.grandTotal}. Exchange within 7 days with this bill. — ${settings.shop.phone}`;
      return json({ results: [{ channel: 'whatsapp', status: 'simulated' }], whatsappLink: waLink(bill.customer.mobile, message), message: 'Receipt ready on WhatsApp.' });
    }
  }

  /* ---- bulk ---- */
  if (root === 'bulk') {
    if (!(await authUser(request, env))) return fail(401, 'Login required.');
    const customers = (await listDocs(env, 'customers')).filter((customer) => isMobile(customer.mobile));
    const fill = (template, customer) =>
      String(template)
        .replaceAll('{name}', customer.name || 'ji')
        .replaceAll('{shop_name}', settings.shop.name)
        .replaceAll('{offer}', settings.offers?.title || 'our new collection')
        .replaceAll('{date}', new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }));

    if (rest[0] === 'preview' && method === 'POST') {
      const input = await body();
      const message = fill(input.message || 'Hello {name}, new arrivals at {shop_name}!', customers[0] || {});
      return json({ count: customers.length, sample: customers.slice(0, 5).map((customer) => ({ name: customer.name, mobile: `XXXXXX${customer.mobile.slice(-4)}`, lastVisit: customer.lastVisit })), preview: message });
    }

    if (rest[0] === 'send-all' && method === 'POST') {
      const input = await body();
      const template = input.message || `Namaste {name}! ${settings.offers?.title || 'New arrivals'} at ${settings.shop.name}. ${settings.offers?.subtitle || ''}`;
      const links = customers.map((customer) => ({
        name: customer.name,
        mobile: customer.mobile,
        link: waLink(customer.mobile, fill(template, customer)),
      }));
      const campaign = {
        _id: newId(),
        audience: 'all',
        audienceLabel: 'All customers · one click',
        channels: ['whatsapp'],
        template,
        subject: `One-click WhatsApp broadcast — ${settings.shop.name}`,
        recipientCount: customers.length,
        sentCount: customers.length,
        failedCount: 0,
        status: 'completed',
        createdAt: nowIso(),
        completedAt: nowIso(),
        createdBy: 'admin',
        results: links.slice(0, 100).map((entry) => ({ name: entry.name, mobile: entry.mobile, status: 'sent', previewLink: entry.link, channels: [{ channel: 'whatsapp', status: 'simulated', link: entry.link }] })),
      };
      await putDoc(env, 'campaigns', campaign);
      return json({ message: `Broadcast prepared for ${customers.length} WhatsApp contacts.`, count: customers.length, sent: customers.length, links }, 201);
    }

    if (rest[0] === 'send' && method === 'POST') {
      const input = await body();
      const template = String(input.message || '');
      if (!template) return fail(400, 'Compose a WhatsApp message before sending.');
      const links = customers.map((customer) => ({ name: customer.name, mobile: customer.mobile, link: waLink(customer.mobile, fill(template, customer)) }));
      const campaign = {
        _id: newId(),
        audience: input.audience || 'all',
        audienceLabel: input.audienceLabel || 'All customers',
        channels: ['whatsapp'],
        template,
        subject: `WhatsApp broadcast from ${settings.shop.name}`,
        recipientCount: customers.length,
        sentCount: customers.length,
        failedCount: 0,
        status: 'completed',
        createdAt: nowIso(),
        completedAt: nowIso(),
        createdBy: 'admin',
        results: links.slice(0, 100).map((entry) => ({ name: entry.name, mobile: entry.mobile, status: 'sent', previewLink: entry.link, channels: [{ channel: 'whatsapp', status: 'simulated', link: entry.link }] })),
      };
      await putDoc(env, 'campaigns', campaign);
      return json({ campaign, message: `WhatsApp campaign sent to ${customers.length} contacts.`, sent: customers.length, failed: 0 }, 201);
    }

    if (rest[0] === 'logs' && method === 'GET') {
      const campaigns = (await listDocs(env, 'campaigns')).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return json({ campaigns, total: campaigns.length });
    }
  }

  /* ---- chatbot ---- */
  if (root === 'chatbot') {
    if (rest[0] === 'logs' && method === 'GET') {
      if (!(await authUser(request, env))) return fail(401, 'Login required.');
      const q = String(url.searchParams.get('q') || '').toLowerCase();
      let logs = (await listDocs(env, 'chatLogs')).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      if (q) logs = logs.filter((log) => [log.preview, log.replyPreview, log.sessionId].join(' ').toLowerCase().includes(q));
      return json({ logs: logs.slice(0, 40), total: logs.length, sessions: new Set(logs.map((log) => log.sessionId)).size, page: 1, pages: Math.max(1, Math.ceil(logs.length / 40)) });
    }
    if (!rest.length && method === 'POST') {
      const input = await body();
      const messages = Array.isArray(input.messages) ? input.messages.slice(-20) : [];
      if (!messages.length) return fail(400, 'Send at least one message.');
      const lastUser = [...messages].reverse().find((message) => message.role === 'user');
      const reply = chatReply(lastUser?.content, settings);
      const sessionId = String(input.sessionId || newId()).slice(0, 64);
      await putDoc(env, 'chatLogs', {
        _id: newId(),
        sessionId,
        source: 'worker',
        preview: String(lastUser?.content || '').slice(0, 140),
        replyPreview: String(reply).slice(0, 140),
        createdAt: nowIso(),
      });
      return json({ reply, source: 'local', suggestions: ['Sherwani collection', 'Delivery time', 'Alteration charges', 'Shop address'] });
    }
  }

  /* ---- games ---- */
  if (root === 'games') {
    const action = rest[0];
    if (action === 'segments' && method === 'GET') {
      return json({ segments: SPIN_SEGMENTS.map(({ label, type, value }) => ({ label, type, value })), games: settings.games });
    }
    if (action === 'quiz' && method === 'GET') {
      return json({ questions: QUIZ.map(({ answer, ...question }) => question) });
    }
    if (action === 'spin' && method === 'POST') {
      const input = await body();
      if (settings.games.spinEnabled === false) return fail(403, 'The spin wheel is paused by the shop right now.');
      const mobile = digits(input.mobile);
      if (!isMobile(mobile)) return fail(400, 'Enter a valid 10-digit mobile number to play.');
      const cooldown = Math.max(1, Number(settings.games.spinCooldownDays) || 7);
      const next = await recentPlay(env, mobile, 'spin', cooldown * 86400000);
      if (next) return json({ error: `You have already spun in the last ${cooldown} days.`, nextAvailableAt: next }, 429);

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
        await recordPlay(env, mobile, 'spin', false, { prize: prize.label });
        return json({ won: false, index, prize: prize.label, message: 'Better luck next week! Visit the shop for in-store offers.' });
      }
      const validity = Math.max(1, Number(settings.games.spinValidityHours) || 48);
      const coupon = await issueCoupon(env, {
        mobile,
        source: 'spin',
        discountType: prize.type === 'percent' ? 'percent' : 'offer',
        discountValue: prize.value,
        applicableOn: prize.applicableOn,
        validityHours: validity,
        label: prize.label,
      });
      await recordPlay(env, mobile, 'spin', true, { prize: prize.label, couponCode: coupon.code });
      return json({ won: true, index, prize: prize.label, coupon, message: `You won ${prize.label}! Coupon ${coupon.code} is valid for ${validity} hours.` });
    }
    if (action === 'puzzle' && method === 'POST') {
      const input = await body();
      if (settings.games.puzzleEnabled === false) return fail(403, 'The puzzle game is paused by the shop right now.');
      const mobile = digits(input.mobile);
      if (!isMobile(mobile)) return fail(400, 'Enter a valid 10-digit mobile number to play.');
      const timeTaken = Number(input.timeTaken) || 0;
      if (timeTaken <= 0 || timeTaken > 120) return fail(400, 'Puzzles must be solved within 2 minutes.');
      const next = await recentPlay(env, mobile, 'puzzle', 86400000);
      if (next) return json({ error: 'You already won a puzzle coupon today.', nextAvailableAt: next }, 429);
      const discount = Math.max(1, Number(settings.games.puzzleDiscount) || 12);
      const validity = Math.max(1, Number(settings.games.puzzleValidityHours) || 24);
      const coupon = await issueCoupon(env, { mobile, source: 'puzzle', discountType: 'percent', discountValue: discount, validityHours: validity, label: `${discount}% OFF — Puzzle solved` });
      await recordPlay(env, mobile, 'puzzle', true, { couponCode: coupon.code, timeTaken });
      return json({ won: true, coupon, message: `Puzzle solved in ${timeTaken}s. ${discount}% OFF coupon ${coupon.code} is yours for ${validity} hours.` });
    }
    if (action === 'quiz' && method === 'POST') {
      const input = await body();
      if (settings.games.quizEnabled === false) return fail(403, 'The quiz is paused by the shop right now.');
      const mobile = digits(input.mobile);
      if (!isMobile(mobile)) return fail(400, 'Enter a valid 10-digit mobile number to play.');
      const answers = Array.isArray(input.answers) ? input.answers.map((value) => Number(value)) : [];
      const correct = QUIZ.reduce((sum, question, index) => sum + (answers[index] === question.answer ? 1 : 0), 0);
      if (correct < QUIZ.length) return json({ won: false, correct, total: QUIZ.length, message: 'Not all answers were right. Try again tomorrow!' });
      const next = await recentPlay(env, mobile, 'quiz', 86400000);
      if (next) return json({ error: 'You already earned today’s quiz coupon.', nextAvailableAt: next }, 429);
      const discount = Math.max(1, Number(settings.games.quizDiscount) || 10);
      const validity = Math.max(1, Number(settings.games.quizValidityHours) || 24);
      const coupon = await issueCoupon(env, { mobile, source: 'quiz', discountType: 'percent', discountValue: discount, validityHours: validity, label: `${discount}% OFF — Quiz champion` });
      await recordPlay(env, mobile, 'quiz', true, { couponCode: coupon.code });
      return json({ won: true, coupon, correct, total: QUIZ.length, message: `All correct! ${discount}% OFF coupon ${coupon.code} is valid for ${validity} hours.` });
    }
    if (!(await authUser(request, env))) return fail(401, 'Login required.');
    if (action === 'coupons' && method === 'GET') {
      const coupons = (await listDocs(env, 'coupons')).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const plays = (await listDocs(env, 'gamePlays')).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
      return json({ coupons, plays, total: coupons.length });
    }
    if (action === 'config') {
      if (method === 'GET') return json({ games: settings.games, segments: SPIN_SEGMENTS.map(({ label, type, value }) => ({ label, type, value })) });
      if (method === 'PUT') {
        const input = await body();
        const games = {
          ...settings.games,
          spinEnabled: input.spinEnabled !== undefined ? Boolean(input.spinEnabled) : settings.games.spinEnabled,
          puzzleEnabled: input.puzzleEnabled !== undefined ? Boolean(input.puzzleEnabled) : settings.games.puzzleEnabled,
          quizEnabled: input.quizEnabled !== undefined ? Boolean(input.quizEnabled) : settings.games.quizEnabled,
          puzzleDiscount: Math.max(0, Math.min(100, Number(input.puzzleDiscount ?? settings.games.puzzleDiscount))),
          quizDiscount: Math.max(0, Math.min(100, Number(input.quizDiscount ?? settings.games.quizDiscount))),
          spinValidityHours: Math.max(1, Number(input.spinValidityHours ?? settings.games.spinValidityHours)),
          puzzleValidityHours: Math.max(1, Number(input.puzzleValidityHours ?? settings.games.puzzleValidityHours)),
          quizValidityHours: Math.max(1, Number(input.quizValidityHours ?? settings.games.quizValidityHours)),
          spinCooldownDays: Math.max(1, Number(input.spinCooldownDays ?? settings.games.spinCooldownDays)),
        };
        const stored = (await getDoc(env, 'settings', 'settings')) || { _id: 'settings' };
        await putDoc(env, 'settings', { ...stored, _id: 'settings', games });
        return json({ games, message: 'Game offers updated.' });
      }
    }
  }

  /* ---- admin ---- */
  if (root === 'admin') {
    if (!(await authUser(request, env))) return fail(401, 'Login required.');
    if (rest[0] === 'stats' && method === 'GET') {
      const [bills, orders, customers, products, campaigns, chatLogs] = await Promise.all([
        listDocs(env, 'bills'),
        listDocs(env, 'orders'),
        listDocs(env, 'customers'),
        listDocs(env, 'products'),
        listDocs(env, 'campaigns'),
        listDocs(env, 'chatLogs'),
      ]);
      return json(dashboard({ bills, orders, customers, products, campaigns, chatLogs, settings }));
    }
    if (rest[0] === 'bags' && method === 'GET') {
      const bags = (await listDocs(env, 'bags')).filter((bag) => Array.isArray(bag.items) && bag.items.length);
      const accounts = await listDocs(env, 'accounts');
      const rows = bags.map((bag) => {
        const account = accounts.find((entry) => entry._id === bag._id);
        return {
          accountId: bag._id,
          name: account?.name || 'Guest account',
          mobile: account?.mobile || '',
          email: account?.email || '',
          items: bag.items,
          itemCount: bag.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
          value: round(bag.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)),
          couponCode: bag.couponCode || '',
          updatedAt: bag.updatedAt,
        };
      });
      return json({ bags: rows, total: rows.length, totalValue: round(rows.reduce((sum, row) => sum + row.value, 0)) });
    }
    if (rest[0] === 'accounts' && method === 'GET') {
      const accounts = await listDocs(env, 'accounts');
      const orders = await listDocs(env, 'orders');
      const bags = await listDocs(env, 'bags');
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
          spend: round(mine.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0)),
          bagItems: (bag?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
          createdAt: account.createdAt,
        };
      });
      return json({ accounts: rows, total: rows.length });
    }
  }

  return fail(404, 'Not found.');
}

/* ------------------------------------------------------------------ */
/* entry                                                               */
/* ------------------------------------------------------------------ */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api')) {
      try {
        return await handleApi(request, env, url);
      } catch (error) {
        return json({ error: error?.message || 'Something went wrong on the server.' }, error?.status || 500);
      }
    }

    // Static assets first, then SPA fallback.
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;
    if (request.method === 'GET' && !url.pathname.includes('.')) {
      return env.ASSETS.fetch(
        new Request(new URL('/index.html', url.origin), { method: 'GET', headers: request.headers })
      );
    }
    return asset;
  },
};
