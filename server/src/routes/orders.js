import { Router } from 'express';
import { getDb } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler, httpError } from '../middleware/error.js';
import { upsertCustomer } from '../services/crm.js';
import { notifyCustomer, waLink } from '../services/notify.js';
import { computeTotals, markCouponUsed, resolveCoupon } from '../services/pricing.js';
import { getSettings } from '../services/settings.js';
import { makeOrderId, newId } from '../utils/ids.js';
import {
  asNumber,
  asString,
  isValidEmail,
  isValidMobile,
  normalizeMobile,
  paginate,
  PINCODE_RE,
  roundMoney,
} from '../utils/validate.js';

const router = Router();
const STATUSES = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const settings = await getSettings(db);
    const body = req.body || {};
    const customerInput = body.customer || {};

    const name = asString(customerInput.name);
    const mobile = normalizeMobile(customerInput.mobile);
    const email = asString(customerInput.email);

    if (name.length < 2) throw httpError(400, 'Please enter your full name.');
    if (!isValidMobile(mobile)) throw httpError(400, 'Enter a valid 10-digit Indian mobile number.');
    if (email && !isValidEmail(email)) throw httpError(400, 'Enter a valid email address.');

    const deliveryType = body.delivery?.type === 'pickup' ? 'pickup' : 'home';
    const address = asString(body.delivery?.address);
    const landmark = asString(body.delivery?.landmark);
    const city = asString(body.delivery?.city) || settings.shop.city;
    const pincode = asString(body.delivery?.pincode);

    if (deliveryType === 'home') {
      if (address.length < 8) throw httpError(400, 'Please enter a complete delivery address.');
      if (!PINCODE_RE.test(pincode)) throw httpError(400, 'Enter a valid 6-digit pincode.');
    }

    const itemsInput = Array.isArray(body.items) ? body.items : [];
    if (!itemsInput.length) throw httpError(400, 'Your cart is empty.');

    const products = await db.collection('products').find({}).toArray();
    const byId = new Map(products.map((product) => [product._id, product]));
    const items = [];

    for (const raw of itemsInput) {
      const product = byId.get(String(raw.productId));
      if (!product) throw httpError(400, 'One of the items in your bag is no longer available.');
      const quantity = Math.max(1, Math.min(asNumber(raw.quantity, 1), 10));
      const size = asString(raw.size) || product.sizes?.[0] || 'M';
      if ((product.sizes || []).length && !product.sizes.includes(size)) {
        throw httpError(400, `Size ${size} is not available for ${product.name}.`);
      }
      if (Number(product.stock) < quantity) {
        throw httpError(400, `Only ${product.stock} left in ${product.name}. Please adjust the quantity.`);
      }
      const unitPrice = Number(product.discountPrice) > 0 ? Number(product.discountPrice) : Number(product.price);
      items.push({
        productId: product._id,
        productName: product.name,
        category: product.category,
        size,
        quantity,
        unitPrice: roundMoney(unitPrice),
        totalPrice: roundMoney(unitPrice * quantity),
        image: product.images?.[0] || '',
      });
    }

    const couponInput = asString(body.couponCode).toUpperCase();
    const { coupon } = await resolveCoupon(db, { code: couponInput, mobile, items });

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryCharge =
      deliveryType === 'home' && subtotal < Number(settings.shipping.freeAbove || 0)
        ? Number(settings.shipping.deliveryCharge || 0)
        : 0;

    const totals = computeTotals({
      items,
      coupon,
      gstPercent: settings.shop.gstPercent,
      deliveryCharge,
    });

    const paymentMethod = ['upi', 'card', 'netbanking', 'cod'].includes(body.paymentMethod)
      ? body.paymentMethod
      : 'cod';
    const now = new Date().toISOString();
    const orderId = makeOrderId();

    const order = {
      _id: newId(),
      orderId,
      customer: {
        name,
        mobile,
        email,
        maskedMobile: `XXXXXX${mobile.slice(-4)}`,
        address: deliveryType === 'home' ? address : settings.shop.address,
        landmark,
        city,
        pincode,
      },
      delivery: {
        type: deliveryType,
        address,
        landmark,
        city,
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
      timeline: [{ status: 'placed', at: now, note: 'Order received on the website' }],
      notes: asString(body.notes),
      source: 'online',
      whatsappLink: waLink(
        mobile,
        `Dear ${name}, your order #${orderId} has been confirmed at ${settings.shop.name}. We'll dispatch it soon! — ${settings.shop.phone}`
      ),
      createdAt: now,
    };

    await db.collection('orders').insertOne(order);
    for (const item of items) {
      await db.collection('products').updateOne({ _id: item.productId }, { $inc: { stock: -item.quantity } });
    }
    await upsertCustomer(db, {
      name,
      mobile,
      email,
      city,
      address: deliveryType === 'home' ? { address, landmark, pincode, city } : null,
      source: 'online',
      amount: totals.grandTotal,
      tags: totals.grandTotal >= 5000 ? ['VIP'] : [],
    });
    await markCouponUsed(db, coupon, orderId);

    const message = `Dear ${name}, your order #${orderId} has been confirmed at ${settings.shop.name}. We'll dispatch it soon! — ${settings.shop.phone}`;
    const notifications = await notifyCustomer({
      customer: { mobile, email },
      message,
      subject: `Order ${orderId} confirmed — ${settings.shop.name}`,
      channels: email ? ['whatsapp', 'email'] : ['whatsapp'],
    });
    await db.collection('orders').updateOne({ _id: order._id }, { $set: { notifications } });

    res.status(201).json({
      order: { ...order, notifications },
      message: 'Order placed successfully.',
      whatsappLink: order.whatsappLink,
    });
  })
);

router.get(
  '/track/:orderId',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const order = await db.collection('orders').findOne({ orderId: String(req.params.orderId).toUpperCase() });
    if (!order) throw httpError(404, 'No order found with that ID. Please check and try again.');
    res.json({
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
        customer: {
          name: order.customer?.name,
          maskedMobile: order.customer?.maskedMobile || `XXXXXX${String(order.customer?.mobile || '').slice(-4)}`,
          city: order.customer?.city,
        },
      },
    });
  })
);

router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const orders = await db.collection('orders').find({}).sort({ createdAt: -1 }).toArray();
    const { status, q, page = 1, limit = 20 } = req.query;
    let filtered = orders;
    if (status && status !== 'all') filtered = filtered.filter((order) => order.status === status);
    if (q) {
      const needle = String(q).toLowerCase();
      filtered = filtered.filter((order) =>
        [order.orderId, order.customer?.name, order.customer?.mobile].join(' ').toLowerCase().includes(needle)
      );
    }
    res.json({ ...paginate(filtered, page, limit), counts: STATUSES.reduce((acc, key) => ({ ...acc, [key]: orders.filter((order) => order.status === key).length }), {}) });
  })
);

router.put(
  '/:id/status',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const status = String(req.body?.status || '').toLowerCase();
    if (!STATUSES.includes(status)) throw httpError(400, 'Unknown order status.');
    const order = await db.collection('orders').findOne({ _id: req.params.id });
    if (!order) throw httpError(404, 'Order not found.');

    const now = new Date().toISOString();
    const timeline = [...(order.timeline || []), { status, at: now, note: `Marked ${status} by shop` }];
    await db.collection('orders').updateOne(
      { _id: order._id },
      {
        $set: {
          status,
          timeline,
          updatedAt: now,
          paymentStatus: status === 'delivered' && order.paymentMethod === 'cod' ? 'paid' : order.paymentStatus,
        },
      }
    );
    if (req.body?.notify) {
      const settings = await getSettings(db);
      await notifyCustomer({
        customer: order.customer,
        message: `Update on order #${order.orderId}: your parcel is now ${status}. — ${settings.shop.name}`,
        channels: ['whatsapp'],
      });
    }
    res.json({ order: { ...order, status, timeline }, message: `Order marked ${status}.` });
  })
);

export default router;
