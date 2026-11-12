import { Router } from 'express';
import { getDb } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler, httpError } from '../middleware/error.js';
import { getSettings } from '../services/settings.js';
import { newId } from '../utils/ids.js';
import {
  asBool,
  asNumber,
  asString,
  cleanTags,
  paginate,
  roundMoney,
} from '../utils/validate.js';

const router = Router();

const CATEGORY_IMAGE = {
  Kurta: '/images/products/kurta-royal.svg',
  Sherwani: '/images/products/sherwani-ivory.svg',
  'Formal Shirt': '/images/products/formal-blue.svg',
  'Casual Wear': '/images/products/casual-olive.svg',
  'Festive Special': '/images/products/festive-maroon.svg',
  Dhoti: '/images/products/dhoti-cream.svg',
};

export const effectivePrice = (product) =>
  Number(product.discountPrice) > 0 ? Number(product.discountPrice) : Number(product.price);

function discountPercent(product) {
  if (!(Number(product.discountPrice) > 0)) return 0;
  return Math.round(((Number(product.price) - Number(product.discountPrice)) / Number(product.price)) * 100);
}

function decorate(product) {
  return { ...product, effectivePrice: effectivePrice(product), discountPercent: discountPercent(product) };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const products = await db.collection('products').find({}).sort({ createdAt: -1 }).toArray();
    const {
      category,
      q,
      minPrice,
      maxPrice,
      size,
      fabric,
      color,
      sort = 'newest',
      page = 1,
      limit = 12,
      featured,
      newArrival,
      sale,
    } = req.query;

    let filtered = products;

    if (category && category !== 'All') {
      if (category === 'Sale') filtered = filtered.filter((product) => discountPercent(product) > 0);
      else filtered = filtered.filter((product) => product.category === category);
    }
    if (q) {
      const needle = String(q).toLowerCase();
      filtered = filtered.filter((product) =>
        [product.name, product.description, product.fabric, product.category, ...(product.tags || [])]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle))
      );
    }
    if (minPrice !== undefined && minPrice !== '') filtered = filtered.filter((product) => effectivePrice(product) >= asNumber(minPrice));
    if (maxPrice !== undefined && maxPrice !== '') filtered = filtered.filter((product) => effectivePrice(product) <= asNumber(maxPrice));
    if (size) filtered = filtered.filter((product) => (product.sizes || []).includes(String(size)));
    if (fabric) filtered = filtered.filter((product) => product.fabric === String(fabric));
    if (color) filtered = filtered.filter((product) => (product.colors || []).some((entry) => String(entry).toLowerCase() === String(color).toLowerCase()));
    if (asBool(featured)) filtered = filtered.filter((product) => product.isFeatured);
    if (asBool(newArrival)) filtered = filtered.filter((product) => product.isNewArrival);
    if (asBool(sale)) filtered = filtered.filter((product) => discountPercent(product) > 0);

    const sorted = [...filtered];
    if (sort === 'price-asc') sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    else if (sort === 'price-desc') sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    else if (sort === 'bestselling') sorted.sort((a, b) => (b.reviewCount || 0) * (b.rating || 0) - (a.reviewCount || 0) * (a.rating || 0));
    else if (sort === 'discount') sorted.sort((a, b) => discountPercent(b) - discountPercent(a));
    else sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const facets = {
      categories: [...new Set(products.map((product) => product.category))].sort(),
      fabrics: [...new Set(products.map((product) => product.fabric).filter(Boolean))].sort(),
      colors: [...new Set(products.flatMap((product) => product.colors || []))].sort(),
      sizes: ['S', 'M', 'L', 'XL', 'XXL'].filter((sizeOption) =>
        products.some((product) => (product.sizes || []).includes(sizeOption))
      ),
      priceRange: {
        min: Math.min(...products.map(effectivePrice), 0),
        max: Math.max(...products.map(effectivePrice), 5000),
      },
    };

    const paged = paginate(sorted, page, limit);
    res.json({ ...paged, items: paged.items.map(decorate), facets });
  })
);

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const db = await getDb();
    const settings = await getSettings(db);
    const products = await db.collection('products').find({}).toArray();

    const base = (settings.categories || []).map((category) => ({
      ...category,
      count: products.filter((product) => product.category === category.name).length,
      image: products.find((product) => product.category === category.name)?.images?.[0] || category.image,
    }));

    for (const category of new Set(products.map((product) => product.category))) {
      if (!base.some((entry) => entry.name === category)) {
        base.push({
          name: category,
          blurb: 'Explore the range',
          count: products.filter((product) => product.category === category).length,
          image: products.find((product) => product.category === category)?.images?.[0],
        });
      }
    }

    base.push({
      name: 'Sale',
      blurb: 'Last pieces, best prices',
      count: products.filter((product) => discountPercent(product) > 0).length,
      image: '/images/products/sale.svg',
    });

    res.json({ categories: base });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const product = await db.collection('products').findOne({ _id: req.params.id });
    if (!product) throw httpError(404, 'Product not found.');
    const related = await db
      .collection('products')
      .find({ category: product.category })
      .limit(6)
      .toArray();
    res.json({
      product: decorate(product),
      related: related.filter((entry) => entry._id !== product._id).slice(0, 4).map(decorate),
    });
  })
);

function normalizeProduct(body, existing = null) {
  const name = asString(body.name, existing?.name || '');
  if (!name) throw httpError(400, 'Product name is required.');
  const price = asNumber(body.price, existing?.price ?? 0);
  if (price <= 0) throw httpError(400, 'Price must be greater than zero.');
  const discountPrice = asNumber(body.discountPrice, existing?.discountPrice ?? 0);
  if (discountPrice && discountPrice >= price) throw httpError(400, 'Discount price must be lower than the selling price.');

  const category = asString(body.category, existing?.category || 'Kurta');
  const images = Array.isArray(body.images)
    ? body.images.map((image) => String(image).trim()).filter(Boolean)
    : existing?.images?.length
      ? existing.images
      : [CATEGORY_IMAGE[category] || CATEGORY_IMAGE.Kurta];

  return {
    name,
    slug:
      existing?.slug ||
      `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Math.random().toString(36).slice(2, 5)}`,
    description: asString(body.description, existing?.description || ''),
    category,
    subcategory: asString(body.subcategory, existing?.subcategory || ''),
    price: roundMoney(price),
    discountPrice: discountPrice ? roundMoney(discountPrice) : 0,
    sizes: cleanTags(body.sizes ?? existing?.sizes ?? ['S', 'M', 'L', 'XL', 'XXL']),
    colors: cleanTags(body.colors ?? existing?.colors ?? []),
    stock: Math.max(asNumber(body.stock, existing?.stock ?? 0), 0),
    images,
    fabric: asString(body.fabric, existing?.fabric || ''),
    tags: cleanTags(body.tags ?? existing?.tags ?? []),
    isFeatured: body.isFeatured !== undefined ? asBool(body.isFeatured) : Boolean(existing?.isFeatured),
    isNewArrival: body.isNewArrival !== undefined ? asBool(body.isNewArrival) : Boolean(existing?.isNewArrival),
    rating: asNumber(body.rating, existing?.rating ?? 4.5),
    reviewCount: asNumber(body.reviewCount, existing?.reviewCount ?? 0),
    washCare: asString(body.washCare, existing?.washCare || 'Gentle machine wash or dry clean. Iron on low heat.'),
  };
}

router.post(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const product = {
      _id: newId(),
      ...normalizeProduct(req.body || {}),
      createdAt: new Date().toISOString(),
    };
    await db.collection('products').insertOne(product);
    res.status(201).json({ product: decorate(product), message: `${product.name} added to the catalogue.` });
  })
);

router.put(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const existing = await db.collection('products').findOne({ _id: req.params.id });
    if (!existing) throw httpError(404, 'Product not found.');
    const updated = { ...existing, ...normalizeProduct(req.body || {}, existing), updatedAt: new Date().toISOString() };
    await db.collection('products').updateOne({ _id: existing._id }, { $set: updated });
    res.json({ product: decorate(updated), message: 'Product updated.' });
  })
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const result = await db.collection('products').deleteOne({ _id: req.params.id });
    if (!result.deletedCount) throw httpError(404, 'Product not found.');
    res.json({ ok: true, message: 'Product removed from catalogue.' });
  })
);

export default router;
