export const defaultSettings = {
  _id: 'settings',
  shop: {
    name: 'Laheri Collection',
    tagline: "We are dressed for every occasion - walk in or order online",
    owner: 'Laheruddin',
    phone: '+91 7800509636',
    whatsapp: '+91 7800509636',
    email: 'laheri.collection@gmail.com',
    address: 'Near Dariyapur Chauraha, In Front of Vishal Mega Mart, Sultanpur - 228001',
    city: 'Sultanpur',
    state: 'Uttar Pradesh',
    pincode: '228001',
    mapsLink: 'https://maps.google.com/?q=Dariyapur+Chauraha+Sultanpur',
    gstin: 'pending',
    gstPercent: 5,
    established: 2025,
    hours: [
      { days: 'Monday – Saturday', time: '10:00 AM – 9:00 PM' },
      { days: 'Sunday', time: '11:00 AM – 7:00 PM' },
    ],
  },
  social: {
    instagram: 'https://instagram.com',
    facebook: 'https://facebook.com',
    youtube: 'https://youtube.com',
    whatsapp: 'https://wa.me/91 7800509636',
    handle: '@laheri.collection',
    posts: [
      { image: '/images/social/post-1.svg', caption: 'New kurta collection now in store.', url: 'https://instagram.com' },
      { image: '/images/social/post-2.svg', caption: 'Festive sherwanis available.', url: 'https://instagram.com' },
      { image: '/images/social/post-3.svg', caption: 'Linen kurtas for summer.', url: 'https://instagram.com' },
      { image: '/images/social/post-4.svg', caption: 'Office formal shirts - new arrival.', url: 'https://instagram.com' },
    ],
  },
  offers: {
    active: true,
    festival: 'Festive Season',
    title: 'Sherwani Season is Here',
    subtitle: 'Flat 20% off on kurtas and sherwanis. Alterations free within 3 days.',
    code: 'FESTIVE20',
    endsOn: '',
  },
  chatbot: {
    welcome: 'Namaste! Main Laheri hoon, aapka shop assistant. Kaise madad kar sakta hoon?',
    extraNotes: 'Alterations are done in-house and take 2–3 days. We accept UPI, cards and cash.',
    enabled: true,
  },
  shipping: {
    freeAbove: 1999,
    deliveryCharge: 79,
    deliveryDays: '2–4 working days',
    pickupNote: 'Ready for pickup in 2 hours during shop hours.',
  },
  games: {
    spinEnabled: true,
    puzzleEnabled: true,
    quizEnabled: true,
    puzzleDiscount: 12,
    quizDiscount: 10,
    spinValidityHours: 48,
    puzzleValidityHours: 24,
    quizValidityHours: 24,
    spinCooldownDays: 7,
  },
  testimonials: [
    { id: 't1', name: 'Aditya Sharma', city: 'Lucknow', rating: 5, text: 'Bought my sherwani here for my sister’s wedding. The fit was perfect after a free alteration and the fabric felt premium.' },
    { id: 't2', name: 'Faizan Ahmed', city: 'Kanpur', rating: 5, text: 'Ordered two kurtas online, delivered in three days. The colours are exactly like the photos.' },
    { id: 't3', name: 'Rohit Verma', city: 'Lucknow', rating: 4, text: 'Honest pricing and a great range of formal shirts.' },
    { id: 't4', name: 'Deepak Yadav', city: 'Barabanki', rating: 5, text: 'The spin wheel gave me 15% off and I used it the same evening. Walked out with a festive kurta at a lovely price.' },
  ],
  categories: [
    { name: 'Kurta', blurb: 'Everyday to festive', image: '/images/photos/cloth-2.jpg' },
    { name: 'Sherwani', blurb: 'Wedding & sangeet', image: '/images/photos/cloth-3.jpg' },
    { name: 'Formal Shirt', blurb: 'Office ready', image: '/images/photos/cloth-4.jpg' },
    { name: 'Casual Wear', blurb: 'Easy weekends', image: '/images/photos/cloth-9.jpg' },
    { name: 'Festive Special', blurb: 'Diwali, Eid, Holi', image: '/images/photos/cloth-1.jpg' },
    { name: 'Dhoti', blurb: 'Traditional drape', image: '/images/products/dhoti-cream.svg' },
  ],
};

const mergeDeep = (base, incoming) => {
  if (Array.isArray(base) || Array.isArray(incoming)) return incoming ?? base;
  if (base && typeof base === 'object' && incoming && typeof incoming === 'object') {
    const output = { ...base };
    for (const key of Object.keys(incoming)) output[key] = mergeDeep(base[key], incoming[key]);
    return output;
  }
  return incoming === undefined ? base : incoming;
};

export async function getSettings(db) {
  const stored = await db.collection('settings').findOne({ _id: 'settings' });
  if (!stored) return structuredClone(defaultSettings);
  const { _id, ...rest } = stored;
  return mergeDeep(structuredClone(defaultSettings), rest);
}

export function publicSettings(settings) {
  return {
    shop: settings.shop,
    social: settings.social,
    offers: settings.offers,
    shipping: settings.shipping,
    games: settings.games,
    chatbot: {
      enabled: settings.chatbot?.enabled !== false,
      welcome: settings.chatbot?.welcome,
      extraNotes: settings.chatbot?.extraNotes,
    },
    testimonials: settings.testimonials,
    categories: settings.categories,
  };
}
