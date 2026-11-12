import crypto from 'node:crypto';

export const newId = () => crypto.randomUUID();

export function randomToken(length = 4) {
  return crypto.randomBytes(length).toString('hex').toUpperCase();
}

export function makeCouponCode(prefix = 'SPIN') {
  return `${prefix}-${randomToken(3)}`;
}

export function makeOrderId() {
  const year = new Date().getFullYear();
  return `ORD-${year}-${randomToken(4)}`;
}

export async function nextBillNumber(db) {
  const bills = db.collection('bills');
  const year = new Date().getFullYear();
  const count = await bills.countDocuments({});
  return `BILL-${year}-${String(count + 1).padStart(3, '0')}`;
}
