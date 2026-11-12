export const formatINR = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export const formatINRDecimal = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

export const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const discountPercent = (product) => {
  if (!product) return 0;
  const price = Number(product.price);
  const sale = Number(product.discountPrice);
  if (!sale || sale >= price) return 0;
  return Math.round(((price - sale) / price) * 100);
};

const APPLICABLE = {
  kurtas: ['Kurta', 'Festive Special'],
  formal: ['Formal Shirt'],
};

export function cartTotals(items, coupon, gstPercent = 5, deliveryCharge = 0) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  let couponDiscount = 0;
  if (coupon) {
    const applicable = items.filter((item) => {
      if (!coupon.applicableOn || coupon.applicableOn === 'all') return true;
      const categories = APPLICABLE[coupon.applicableOn];
      return !categories || categories.includes(item.category);
    });
    const base = applicable.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
    if (coupon.discountType === 'percent') couponDiscount = (base * Number(coupon.discountValue)) / 100;
    else if (coupon.discountType === 'flat' || coupon.discountType === 'offer') {
      couponDiscount = Math.min(Number(coupon.discountValue) || 0, base);
    }
  }
  const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
  const discount = round(Math.min(couponDiscount, subtotal));
  const taxable = round(subtotal - discount);
  const gstAmount = round((taxable * Number(gstPercent || 0)) / 100);
  const grandTotal = round(taxable + gstAmount + Number(deliveryCharge || 0));
  return { subtotal: round(subtotal), discount, taxable, gstAmount, gstPercent, deliveryCharge, grandTotal };
}

export const orderStatusSteps = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'];

export const prettyStatus = (status = '') => {
  const map = {
    placed: 'Order placed',
    confirmed: 'Confirmed',
    packed: 'Packed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return map[status] || status;
};
