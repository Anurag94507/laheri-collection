// Real product photography for the storefront.
//
// The catalogue photographs that ship with the shop are generic apparel shots,
// so each seeded piece is paired with the photograph that actually shows that
// kind of garment. Anything the shopkeeper uploads through the admin panel (a
// real photograph of the actual piece) always takes priority.
const PHOTO = {
  indigoHanger: '/images/photos/cloth-2.jpg',
  blackTeeHanger: '/images/photos/cloth-6.jpg',
  studioTee: '/images/shop/tee-studio.jpg',
  whiteShirt: '/images/photos/cloth-7.jpg',
  flatlayShirts: '/images/photos/cloth-5.jpg',
  blueStriped: '/images/photos/cloth-4.jpg',
  blueSuit: '/images/photos/cloth-1.jpg',
  navySuit: '/images/photos/cloth-3.jpg',
  bomber: '/images/photos/cloth-9.jpg',
  denimJacket: '/images/photos/cloth-12.jpg',
  whiteTee: '/images/photos/cloth-10.jpg',
  graphicTee: '/images/photos/cloth-11.jpg',
};

const BY_SLUG = {
  'kurta-royal': PHOTO.indigoHanger,
  'kurta-ivory': PHOTO.whiteShirt,
  'kurta-printed': PHOTO.flatlayShirts,
  'kurta-olive': PHOTO.bomber,
  'kurta-black': PHOTO.blackTeeHanger,
  'sherwani-ivory': PHOTO.blueSuit,
  'sherwani-maroon': PHOTO.navySuit,
  'sherwani-indigo': PHOTO.blueStriped,
  'sherwani-sage': PHOTO.denimJacket,
  'formal-blue': PHOTO.blueStriped,
  'formal-white': PHOTO.whiteShirt,
  'formal-check': PHOTO.flatlayShirts,
  'formal-linen': PHOTO.studioTee,
  'casual-olive': PHOTO.bomber,
  'casual-navy': PHOTO.graphicTee,
  'casual-denim': PHOTO.denimJacket,
  'casual-hoodie': PHOTO.studioTee,
  'festive-maroon': PHOTO.navySuit,
  'festive-gold': PHOTO.blueSuit,
  'festive-green': PHOTO.denimJacket,
  'dhoti-cream': PHOTO.flatlayShirts,
  'dhoti-black': PHOTO.blackTeeHanger,
};

const BY_CATEGORY = {
  Kurta: [PHOTO.indigoHanger, PHOTO.whiteShirt, PHOTO.flatlayShirts, PHOTO.bomber],
  Sherwani: [PHOTO.blueSuit, PHOTO.navySuit, PHOTO.blueStriped, PHOTO.denimJacket],
  'Formal Shirt': [PHOTO.blueStriped, PHOTO.whiteShirt, PHOTO.flatlayShirts, PHOTO.studioTee],
  'Casual Wear': [PHOTO.bomber, PHOTO.graphicTee, PHOTO.denimJacket, PHOTO.whiteTee],
  'Festive Special': [PHOTO.navySuit, PHOTO.blueSuit, PHOTO.denimJacket, PHOTO.bomber],
  Dhoti: [PHOTO.flatlayShirts, PHOTO.blackTeeHanger],
};

const isPlaceholder = (src) => !src || /\.svg(\?.*)?$/i.test(src);

const slugOf = (product) => {
  if (product.slug) return product.slug;
  return String(product._id || '').replace(/^prd_/, '');
};

const hashOf = (value) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 9973;
  }
  return hash;
};

// A genuine second photograph for the hover swap. Fabric-weave swatches and
// placeholder SVGs are not photographs, so they never count as the second look.
export function garmentSecondImage(product) {
  const real = (src) =>
    src && !isPlaceholder(src) && (/^https?:/i.test(src) || /\.(jpe?g|png|webp|avif)(\?.*)?$/i.test(src));
  const rest = (product?.images || []).filter(real);
  const primary = garmentImage(product);
  return rest.find((src) => src !== primary && (src.includes('/uploads/') || /^https?:/i.test(src)))
    || rest.find((src) => src !== primary)
    || null;
}

export function garmentImage(product) {
  if (!product) return PHOTO.indigoHanger;
  const slug = slugOf(product);
  if (BY_SLUG[slug]) return BY_SLUG[slug];

  // Anything the shop uploads itself (a photo of the actual piece) wins over
  // the catalogue photography.
  const stored = product.images?.[0];
  if (!isPlaceholder(stored) && (/^https?:/i.test(stored) || stored.includes('/uploads/'))) return stored;

  const pool = BY_CATEGORY[product.category] || [PHOTO.indigoHanger, PHOTO.whiteShirt, PHOTO.bomber];
  return pool[hashOf(slug) % pool.length];
}

// Extra shots for the detail page: the hanging shot plus any other real
// photographs the shop has attached to the piece.
export function garmentGallery(product) {
  const primary = garmentImage(product);
  const rest = (product?.images || []).filter((src) => !isPlaceholder(src) && src !== primary);
  return [...new Set([primary, ...rest])].slice(0, 4);
}

export const GARMENT_CATEGORIES = Object.keys(BY_CATEGORY);
