import { getDb } from './db/index.js';
import { products as productSeed, PRODUCT_IMAGES } from './data/products.js';
import { defaultSettings } from './services/settings.js';
import { computeTotals } from './services/pricing.js';
import { newId } from './utils/ids.js';
import { roundMoney } from './utils/validate.js';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const iso = (daysAgo, hour = 12) => {
  const date = new Date(now - daysAgo * DAY);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
};

const db = await getDb();

const collections = ['products', 'customers', 'orders', 'bills', 'coupons', 'gamePlays', 'chatLogs', 'campaigns', 'settings'];
for (const name of collections) await db.replaceCollection(name, []);

await db.replaceCollection('settings', [{ ...defaultSettings, updatedAt: iso(1) }]);

const productDocs = productSeed.map((product) => {
  const { daysAgo, tone, accent, ...rest } = product;
  return {
    _id: `prd_${product.slug}`,
    ...rest,
    slug: product.slug,
    images: [
      `/images/products/${product.slug}.svg`,
      ...PRODUCT_IMAGES.map((name) => `/images/fabric/${name}.svg`),
    ],
    washCare: 'Gentle machine wash cold, or dry clean for silk and velvet. Iron on low heat.',
    createdAt: iso(daysAgo),
  };
});
await db.replaceCollection('products', productDocs);

const bySlug = Object.fromEntries(productDocs.map((product) => [product.slug, product]));

const customers = [
  ['Aditya Sharma', '9876501234', 'aditya.sharma@example.com', 'Lucknow', 7, 18470, 2, ['VIP', 'Festival Buyer']],
  ['Faizan Ahmed', '9822114455', 'faizan.ahmed@example.com', 'Kanpur', 4, 5298, 14, ['Festival Buyer']],
  ['Rohit Verma', '9918776655', 'rohit.verma@example.com', 'Lucknow', 3, 4197, 21, []],
  ['Deepak Yadav', '9811223344', '', 'Barabanki', 2, 2598, 35, ['First-Timer']],
  ['Amit Srivastava', '9935442211', 'amit.s@example.com', 'Lucknow', 5, 12600, 1, ['VIP', 'Repeat Buyer']],
  ['Sandeep Gupta', '9807654321', '', 'Unnao', 1, 1799, 68, ['First-Timer']],
  ['Imran Khan', '9871239087', 'imran.khan@example.com', 'Lucknow', 3, 7498, 9, ['Repeat Buyer']],
  ['Vikas Singh', '9918007766', 'vikas.singh@example.com', 'Hardoi', 1, 999, 96, ['First-Timer']],
  ['Anshu Mishra', '9822334455', '', 'Lucknow', 2, 3298, 46, []],
  ['Prateek Jain', '9900112233', 'prateek.jain@example.com', 'Kanpur', 8, 31250, 3, ['VIP', 'Wholesale']],
  ['Shivam Tiwari', '9870098765', '', 'Lucknow', 1, 1399, 120, []],
  ['Naveen Kumar', '9812345670', 'naveen.k@example.com', 'Sitapur', 2, 2898, 57, ['Repeat Buyer']],
  ['Aarav Saxena', '9922110099', 'aarav.saxena@example.com', 'Lucknow', 1, 1299, 6, []],
  ['Mohit Rastogi', '9867001122', '', 'Lucknow', 4, 8796, 26, ['Repeat Buyer', 'Festival Buyer']],
  ['Salman Qureshi', '9839004455', 'salman.q@example.com', 'Barabanki', 1, 1899, 74, []],
  ['Kunal Bhatt', '9891122334', '', 'Lucknow', 2, 4798, 40, []],
  ['Rakesh Pandey', '9876541122', 'rakesh.p@example.com', 'Unnao', 3, 5697, 17, ['Repeat Buyer']],
  ['Harsh Chaurasia', '9912003344', '', 'Lucknow', 1, 799, 132, []],
];

const customerDocs = customers.map(([name, mobile, email, city, totalOrders, totalSpend, daysAgo, tags], index) => ({
  _id: `cus_${index + 1}`,
  name,
  mobile,
  email,
  city,
  tags,
  sources: index % 3 === 0 ? ['online'] : ['offline'],
  totalOrders,
  totalSpend,
  firstVisit: iso(daysAgo + 40),
  lastVisit: iso(daysAgo),
  createdAt: iso(daysAgo + 40),
  notes: '',
  lastAddress:
    index === 0
      ? { address: '24, Gomti Nagar Extension, Near Lulu Mall', landmark: 'Opposite Sahara Hospital', pincode: '226010', city: 'Lucknow' }
      : null,
}));
await db.replaceCollection('customers', customerDocs);

const line = (slug, quantity, size) => {
  const product = bySlug[slug];
  const unitPrice = product.discountPrice > 0 ? product.discountPrice : product.price;
  return {
    productId: product._id,
    productName: product.name,
    category: product.category,
    size: size || product.sizes[0],
    quantity,
    unitPrice,
    totalPrice: roundMoney(unitPrice * quantity),
  };
};

const billSpecs = [
  ['BILL-2025-001', 'Aditya Sharma', '9876501234', 'aditya.sharma@example.com', [line('kurta-royal', 1), line('formal-blue', 1)], 'upi', 0, 1],
  ['BILL-2025-002', 'Faizan Ahmed', '9822114455', 'faizan.ahmed@example.com', [line('sherwani-indigo', 1, 'L')], 'card', 500, 2],
  ['BILL-2025-003', 'Rohit Verma', '9918776655', '', [line('casual-denim', 1, '32'), line('casual-olive', 2, 'L')], 'cash', 0, 3],
  ['BILL-2025-004', 'Imran Khan', '9871239087', 'imran.khan@example.com', [line('festive-maroon', 2, 'L')], 'upi', 300, 4],
  ['BILL-2025-005', 'Prateek Jain', '9900112233', 'prateek.jain@example.com', [line('sherwani-ivory', 1, 'L'), line('dhoti-black', 1)], 'card', 1500, 5],
  ['BILL-2025-006', 'Mohit Rastogi', '9867001122', '', [line('formal-check', 1, 'L'), line('formal-white', 1, 'L')], 'cash', 100, 6],
  ['BILL-2025-007', 'Amit Srivastava', '9935442211', 'amit.s@example.com', [line('sherwani-maroon', 1, 'L')], 'upi', 2000, 8],
  ['BILL-2025-008', 'Harsh Chaurasia', '9912003344', '', [line('casual-olive', 1, 'M')], 'cash', 0, 9],
];

const billDocs = billSpecs.map(([billNumber, name, mobile, email, items, paymentMethod, extraDiscount, daysAgo], index) => {
  const totals = computeTotals({ items, gstPercent: 5, extraDiscount });
  return {
    _id: `bill_${index + 1}`,
    billNumber,
    customer: { name, mobile, email },
    items,
    ...totals,
    paymentMethod,
    saveToCrm: true,
    billType: 'offline',
    notes: '',
    createdBy: 'admin',
    createdAt: iso(daysAgo, 11 + index),
  };
});
await db.replaceCollection('bills', billDocs);

const orderSpecs = [
  [
    'Aditya Sharma',
    '9876501234',
    'aditya.sharma@example.com',
    [line('festive-gold', 1, 'L')],
    'delivered',
    3,
    { address: '24, Gomti Nagar Extension, Near Lulu Mall', landmark: 'Opposite Sahara Hospital', pincode: '226010', city: 'Lucknow' },
  ],
  [
    'Naveen Kumar',
    '9812345670',
    'naveen.k@example.com',
    [line('kurta-printed', 2, 'L')],
    'shipped',
    1,
    { address: 'H No 18, Civil Lines, Near Bus Depot', landmark: 'Behind SBI branch', pincode: '261001', city: 'Sitapur' },
  ],
  [
    'Aarav Saxena',
    '9922110099',
    'aarav.saxena@example.com',
    [line('formal-blue', 1, 'M')],
    'placed',
    0,
    { address: 'B-42, Aliganj Sector H', landmark: 'Near Ram Manohar Lohia Park', pincode: '226024', city: 'Lucknow' },
  ],
  [
    'Kunal Bhatt',
    '9891122334',
    '',
    [line('casual-hoodie', 1, 'L')],
    'confirmed',
    2,
    { address: '67, Indira Nagar Colony', landmark: 'Near Munshipulia crossing', pincode: '226016', city: 'Lucknow' },
  ],
];

const statusTimeline = (status, daysAgo) => {
  const sequence = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'];
  const upto = sequence.indexOf(status);
  return sequence.slice(0, upto + 1).map((entry, index) => ({
    status: entry,
    at: iso(Math.max(daysAgo - index, 0), 10 + index),
    note: index === 0 ? 'Order received on the website' : `Marked ${entry} by shop`,
  }));
};

const orderDocs = orderSpecs.map(([name, mobile, email, items, status, daysAgo, address], index) => {
  const totals = computeTotals({ items, gstPercent: 5, deliveryCharge: 0 });
  const orderId = `ORD-2025-${String(1201 + index)}`;
  return {
    _id: `ord_${index + 1}`,
    orderId,
    customer: { name, mobile, email, maskedMobile: `XXXXXX${mobile.slice(-4)}`, ...address },
    delivery: {
      type: 'home',
      address: address.address,
      landmark: address.landmark,
      city: address.city,
      pincode: address.pincode,
      charge: 0,
      expected: '2–4 working days',
    },
    items,
    ...totals,
    coupon: null,
    paymentMethod: index % 2 === 0 ? 'upi' : 'cod',
    paymentStatus: index % 2 === 0 ? 'paid' : status === 'delivered' ? 'paid' : 'pending',
    status,
    timeline: statusTimeline(status, daysAgo),
    notes: '',
    source: 'online',
    notifications: [{ channel: 'whatsapp', status: 'simulated' }],
    createdAt: iso(daysAgo, 13),
  };
});
await db.replaceCollection('orders', orderDocs);

const in48 = new Date(now + 2 * DAY).toISOString();
const in24 = new Date(now + DAY).toISOString();
await db.replaceCollection('coupons', [
  {
    _id: 'cpn_1',
    code: 'SPIN-4K2P',
    discountType: 'percent',
    discountValue: 15,
    applicableOn: 'all',
    validUntil: in48,
    usedBy: '9811223344',
    isUsed: false,
    source: 'spin',
    label: '15% OFF',
    createdAt: iso(1),
  },
  {
    _id: 'cpn_2',
    code: 'PUZZLE-9QR3',
    discountType: 'percent',
    discountValue: 12,
    applicableOn: 'all',
    validUntil: in24,
    usedBy: '9876541122',
    isUsed: true,
    usedAt: iso(2),
    usedOn: 'BILL-2025-006',
    source: 'puzzle',
    label: '12% OFF — Puzzle solved',
    createdAt: iso(3),
  },
  {
    _id: 'cpn_3',
    code: 'FESTIVE20',
    discountType: 'percent',
    discountValue: 20,
    applicableOn: 'kurtas',
    validUntil: new Date(now + 12 * DAY).toISOString(),
    usedBy: '',
    isUsed: false,
    source: 'admin',
    label: 'Festive 20% on kurtas',
    createdAt: iso(5),
  },
]);

await db.replaceCollection('gamePlays', [
  { _id: newId(), mobile: '9811223344', game: 'spin', won: true, prize: '15% OFF', couponCode: 'SPIN-4K2P', createdAt: iso(1) },
  { _id: newId(), mobile: '9876541122', game: 'puzzle', won: true, couponCode: 'PUZZLE-9QR3', timeTaken: 68, createdAt: iso(3) },
]);

await db.replaceCollection('chatLogs', [
  { _id: newId(), sessionId: 'demo-session-1', source: 'local', preview: 'What are your timings?', replyPreview: 'We are open Monday to Saturday…', createdAt: iso(0, 10) },
  { _id: newId(), sessionId: 'demo-session-1', source: 'local', preview: 'Do you have sherwanis?', replyPreview: 'Yes, we stock wedding and festive sherwanis…', createdAt: iso(0, 10) },
  { _id: newId(), sessionId: 'demo-session-2', source: 'local', preview: 'Where is the shop?', replyPreview: 'We are at Sadar Bazaar Road…', createdAt: iso(0, 12) },
]);

await db.replaceCollection('campaigns', [
  {
    _id: newId(),
    audience: 'all',
    audienceLabel: 'All customers',
    channels: ['whatsapp', 'sms'],
    template: 'Namaste {name}! The new festive collection has arrived at {shop_name}. Flat 20% off this week.',
    subject: 'Festive collection is here',
    recipientCount: 18,
    sentCount: 18,
    failedCount: 0,
    status: 'completed',
    createdAt: iso(4),
    completedAt: iso(4),
    createdBy: 'admin',
    results: [],
  },
  {
    _id: newId(),
    audience: 'recent',
    audienceLabel: 'Customers in last 30 days',
    channels: ['whatsapp'],
    template: 'Dear {name}, thank you for shopping with us. Your alteration is ready for pickup.',
    subject: 'Alteration ready',
    recipientCount: 9,
    sentCount: 9,
    failedCount: 0,
    status: 'completed',
    createdAt: iso(11),
    completedAt: iso(11),
    createdBy: 'admin',
    results: [],
  },
]);

console.log(`[seed] ${productDocs.length} products, ${customerDocs.length} contacts, ${billDocs.length} bills, ${orderDocs.length} orders.`);
if (typeof db.close === 'function') await db.close();
process.exit(0);
