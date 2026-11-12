import { newId } from '../utils/ids.js';
import { isValidMobile, normalizeMobile, roundMoney } from '../utils/validate.js';

/**
 * Adds or refreshes a CRM contact. Called from orders, offline bills, game
 * entries and chatbot lead capture so every contact lands in one place.
 */
export async function upsertCustomer(
  db,
  { name = '', mobile = '', email = '', city = '', address = null, source = 'online', amount = 0, tags = [], note = '', countOrder = true }
) {
  const normalized = normalizeMobile(mobile);
  if (!isValidMobile(normalized)) return null;

  const collection = db.collection('customers');
  const existing = await collection.findOne({ mobile: normalized });
  const now = new Date().toISOString();

  if (existing) {
    const mergedTags = [...new Set([...(existing.tags || []), ...tags])];
    const mergedSources = [...new Set([...(existing.sources || []), source])];
    const update = {
      name: name || existing.name,
      email: email || existing.email,
      city: city || existing.city,
      lastVisit: now,
      tags: mergedTags,
      sources: mergedSources,
      totalSpend: roundMoney(Number(existing.totalSpend || 0) + Number(amount || 0)),
    };
    if (countOrder) update.totalOrders = Number(existing.totalOrders || 0) + 1;
    if (address) update.lastAddress = address;
    if (note) update.notes = existing.notes ? `${existing.notes}\n${note}` : note;
    await collection.updateOne({ _id: existing._id }, { $set: update });
    return { ...existing, ...update };
  }

  const doc = {
    _id: newId(),
    name: name || 'Guest',
    mobile: normalized,
    email: email || '',
    city: city || '',
    tags: [...new Set(tags)],
    sources: [source],
    totalOrders: countOrder ? 1 : 0,
    totalSpend: roundMoney(Number(amount || 0)),
    lastAddress: address || null,
    firstVisit: now,
    lastVisit: now,
    createdAt: now,
    notes: note || '',
  };
  await collection.insertOne(doc);
  return doc;
}

export function customerSegment(customer) {
  if ((customer.tags || []).includes('VIP') || Number(customer.totalSpend) >= 10000) return 'VIP';
  if (Number(customer.totalOrders) >= 2) return 'Repeat';
  return 'New';
}
