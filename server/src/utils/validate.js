export const MOBILE_RE = /^[6-9]\d{9}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PINCODE_RE = /^[1-9]\d{5}$/;

export function normalizeMobile(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function isValidMobile(value) {
  return MOBILE_RE.test(normalizeMobile(value));
}

export function isValidEmail(value) {
  return !value || EMAIL_RE.test(String(value).trim());
}

export function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function asString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

export function asBool(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function cleanTags(tags) {
  if (Array.isArray(tags)) return [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))];
  if (typeof tags === 'string') {
    return [...new Set(tags.split(',').map((tag) => tag.trim()).filter(Boolean))];
  }
  return [];
}

export function paginate(items, page = 1, limit = 12) {
  const safeLimit = Math.min(Math.max(asNumber(limit, 12), 1), 100);
  const safePage = Math.max(asNumber(page, 1), 1);
  const start = (safePage - 1) * safeLimit;
  return {
    items: items.slice(start, start + safeLimit),
    total: items.length,
    page: safePage,
    pages: Math.max(Math.ceil(items.length / safeLimit), 1),
    limit: safeLimit,
  };
}
