// The catalogue stores category, subcategory and tags rather than separate
// gender/occasion columns, so the shop derives those facets from the piece
// itself. Filtering on them stays truthful to what is actually on the rail.

export const GENDERS = ['Men', 'Women', 'Kids'];

export function productGender(product) {
  const text = `${product?.name || ''} ${product?.category || ''} ${product?.subcategory || ''} ${(product?.tags || []).join(' ')}`;
  if (/\b(women|woman|saree|sari|kurti|lehenga|girls?|ladies)\b/i.test(text)) return 'Women';
  if (/\b(kids?|boys?|children)\b/i.test(text)) return 'Kids';
  return 'Men';
}

export function productOccasions(product) {
  const text = `${product?.name || ''} ${product?.category || ''} ${product?.subcategory || ''} ${(product?.tags || []).join(' ')}`;
  const found = new Set();
  if (/sherwani|wedding|groom|sangeet|mehendi/i.test(text)) found.add('Wedding');
  if (/festive|diwali|eid|pooja|holi|celebration/i.test(text)) found.add('Festive');
  if (/formal|office|boardroom|suit|shirt/i.test(text)) found.add('Formal');
  if (/casual|everyday|summer|weekend|linen/i.test(text)) found.add('Casual');
  if (!found.size) found.add('Everyday');
  return [...found];
}

export function matchesFacets(product, { gender, occasion }) {
  if (gender && productGender(product) !== gender) return false;
  if (occasion && !productOccasions(product).includes(occasion)) return false;
  return true;
}
