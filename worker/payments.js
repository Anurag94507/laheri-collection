/**
 * Razorpay online payments.
 * Configure RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET (test or live keys) as Worker secrets.
 * Without them the storefront quietly keeps cash on delivery only.
 */
const TIMEOUT_MS = 8000;
const API = 'https://api.razorpay.com/v1';
const value = (env, key) => String(env[key] || '').trim();

export function razorpayConfig(env) {
  const keyId = value(env, 'RAZORPAY_KEY_ID');
  const keySecret = value(env, 'RAZORPAY_KEY_SECRET');
  return { enabled: Boolean(keyId && keySecret), keyId };
}

const authHeader = (env) =>
  `Basic ${btoa(`${value(env, 'RAZORPAY_KEY_ID')}:${value(env, 'RAZORPAY_KEY_SECRET')}`)}`;

async function call(env, path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: authHeader(env), 'Content-Type': 'application/json', ...(init.headers || {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body };
}

/** Creates a Razorpay order for the amount the customer is about to pay. */
export async function createPaymentOrder(env, { amount, receipt }) {
  const config = razorpayConfig(env);
  if (!config.enabled) throw new Error('Online payments are not set up yet.');
  const paise = Math.round(Number(amount) * 100);
  if (!Number.isFinite(paise) || paise < 100) throw new Error('That payment amount is not valid.');

  const result = await call(env, '/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount: paise,
      currency: 'INR',
      receipt: String(receipt || `receipt-${Date.now()}`).slice(0, 40),
    }),
  });
  if (!result.ok || !result.body?.id)
    throw new Error(`Razorpay refused the payment order (${result.status})`);

  return { orderId: result.body.id, amount: result.body.amount, currency: result.body.currency || 'INR', keyId: config.keyId };
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Verifies the checkout signature and returns how much Razorpay actually captured. */
export async function verifyPayment(env, { orderId, paymentId, signature }) {
  const config = razorpayConfig(env);
  if (!config.enabled) throw new Error('Online payments are not set up yet.');
  if (!orderId || !paymentId || !signature) throw new Error('Missing payment details.');

  const expected = await hmacHex(value(env, 'RAZORPAY_KEY_SECRET'), `${orderId}|${paymentId}`);
  if (expected !== String(signature)) return { ok: false, amount: 0 };

  const result = await call(env, `/orders/${encodeURIComponent(orderId)}`);
  const paid = result.ok && result.body ? Number(result.body.amount_paid || result.body.amount || 0) / 100 : 0;
  return { ok: true, amount: paid, paymentId };
}
