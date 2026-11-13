import { Router } from 'express';
import { getDb } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler, httpError } from '../middleware/error.js';
import { newId } from '../utils/ids.js';
import { asBool, asString } from '../utils/validate.js';

const router = Router();

function normalize(body, existing = {}) {
  const name = asString(body.name, existing.name || '').trim();
  if (!name) throw httpError(400, 'Category name is required.');
  return {
    name,
    blurb: asString(body.blurb, existing.blurb || 'Explore the range'),
    image: asString(body.image, existing.image || '/images/products/kurta-royal.svg'),
    active: body.active !== undefined ? asBool(body.active) : existing.active !== false,
  };
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const db = await getDb();
    const products = await db.collection('products').find({}).toArray();
    const stored = await db.collection('categories').find({}).toArray();

    let list = stored;
    if (!list.length) {
      const names = [...new Set(products.map((product) => product.category).filter(Boolean))];
      list = names.map((name) => ({
        _id: `cat_${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name,
        blurb: 'Explore the range',
        image: products.find((product) => product.category === name)?.images?.[0] || '/images/products/kurta-royal.svg',
        active: true,
      }));
    }

    const categories = list
      .filter((category) => category.active !== false)
      .map((category) => ({
        ...category,
        count: products.filter((product) => product.category === category.name).length,
      }));

    res.json({ categories });
  })
);

router.get(
  '/admin',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const db = await getDb();
    const products = await db.collection('products').find({}).toArray();
    const categories = await db.collection('categories').find({}).sort({ name: 1 }).toArray();
    res.json({
      categories: categories.map((category) => ({
        ...category,
        count: products.filter((product) => product.category === category.name).length,
      })),
    });
  })
);

router.post(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const data = normalize(req.body || {});
    const existing = await db.collection('categories').findOne({ name: data.name });
    if (existing) throw httpError(409, 'That category already exists.');
    const category = { _id: newId(), ...data, createdAt: new Date().toISOString() };
    await db.collection('categories').insertOne(category);
    res.status(201).json({ category, message: `${category.name} added.` });
  })
);

router.put(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const existing = await db.collection('categories').findOne({ _id: req.params.id });
    if (!existing) throw httpError(404, 'Category not found.');
    const data = normalize(req.body || {}, existing);
    const clash = await db.collection('categories').findOne({ name: data.name });
    if (clash && clash._id !== existing._id) throw httpError(409, 'Another category already uses that name.');

    // Keep products in sync when a category is renamed.
    if (data.name !== existing.name) {
      const products = await db.collection('products').find({ category: existing.name }).toArray();
      for (const product of products) {
        await db.collection('products').updateOne({ _id: product._id }, { $set: { category: data.name } });
      }
    }

    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await db.collection('categories').updateOne({ _id: existing._id }, { $set: updated });
    res.json({ category: updated, message: 'Category updated.' });
  })
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const existing = await db.collection('categories').findOne({ _id: req.params.id });
    if (!existing) throw httpError(404, 'Category not found.');
    const inUse = await db.collection('products').countDocuments({ category: existing.name });
    if (inUse > 0) throw httpError(400, `${inUse} product(s) still use "${existing.name}". Move them first.`);
    await db.collection('categories').deleteOne({ _id: existing._id });
    res.json({ ok: true, message: `${existing.name} removed.` });
  })
);

export default router;
