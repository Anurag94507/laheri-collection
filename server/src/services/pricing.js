import { httpError } from '../middleware/error.js';
import { normalizeMobile, roundMoney } from '../utils/validate.js';

const APPLICABILITY = {
  kurtas: ['Kurta', 'Festive Special'],
  formal: ['Formal Shirt'],
};

function matchesApplicability(applicableOn, item) {
  if (!applicableOn || applicableOn === 'all') return true;
  const categories = APPLICABILITY[applicableOn];
  if (!categories) return true;
  return categories.includes(item.category);
}

export function computeTotals({ items = [], coupon = null, gstPercent = 5, extraDiscount = 0, deliveryCharge = 0 }) {
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0)
  );

  let couponDiscount = 0;
  if (coupon) {
    const applicable = items.filter((item) => matchesApplicability(coupon.applicableOn, item));
    const base = roundMoney(applicable.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0));
    if (coupon.discountType === 'percent') couponDiscount = roundMoney((base * Number(coupon.discountValue || 0)) / 100);
    else if (coupon.discountType === 'flat') couponDiscount = Math.min(Number(coupon.discountValue || 0), base);
  }

  const discount = Math.min(roundMoney(couponDiscount + Number(extraDiscount || 0)), subtotal);
  const taxable = roundMoney(subtotal - discount);
  const gstAmount = roundMoney((taxable * Number(gstPercent || 0)) / 100);
  const grandTotal = roundMoney(taxable + gstAmount + Number(deliveryCharge || 0));

  return {
    subtotal,
    discount,
    taxable,
    gstPercent: Number(gstPercent || 0),
    gstAmount,
    deliveryCharge: roundMoney(deliveryCharge),
    grandTotal,
  };
}

export async function resolveCoupon(db, { code, mobile, items = [] }) {
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode) return { coupon: null, message: '' };

  const coupon = await db.collection('coupons').findOne({ code: cleanCode });
  if (!coupon) throw httpError(400, 'That coupon code does not exist.');
  if (coupon.isUsed) throw httpError(400, 'This coupon has already been used.');
  if (coupon.validUntil && new Date(coupon.validUntil).getTime() < Date.now()) {
    throw httpError(400, 'This coupon has expired. Play again for a fresh one.');
  }
  if (coupon.usedBy && mobile && normalizeMobile(coupon.usedBy) !== normalizeMobile(mobile)) {
    throw httpError(400, 'This coupon is linked to a different mobile number.');
  }

  const preview = computeTotals({ items, coupon, gstPercent: 0 });
  if (preview.discount <= 0) {
    throw httpError(400, 'This coupon does not apply to the items in your bag.');
  }

  return { coupon, message: `${coupon.code} applied — you saved ₹${preview.discount}` };
}

export async function markCouponUsed(db, coupon, reference) {
  if (!coupon?._id) return;
  await db.collection('coupons').updateOne(
    { _id: coupon._id },
    { $set: { isUsed: true, usedAt: new Date().toISOString(), usedOn: reference || '' } }
  );
}
