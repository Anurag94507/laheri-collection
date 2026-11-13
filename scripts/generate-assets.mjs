/**
 * Generates the shop's artwork as local SVG files so the storefront never
 * depends on remote image hosts. Run with: node scripts/generate-assets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { products } from '../server/src/data/products.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const imagesDir = path.join(root, 'client', 'public', 'images');
const productDir = path.join(imagesDir, 'products');
const fabricDir = path.join(imagesDir, 'fabric');
const socialDir = path.join(imagesDir, 'social');
for (const dir of [productDir, fabricDir, socialDir]) fs.mkdirSync(dir, { recursive: true });

const hashString = (value) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const makeRng = (seed) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
const shade = (hex, amount) => {
  const value = hex.replace('#', '');
  const num = parseInt(value.length === 3 ? value.split('').map((char) => char + char).join('') : value, 16);
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

const svg = (width, height, inner, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" ${extra}>${inner}</svg>\n`;

function backgroundPattern(id, type, color, opacity = 0.12) {
  if (type === 'paisley') {
    return `<pattern id="${id}" width="96" height="96" patternUnits="userSpaceOnUse">
      <g fill="none" stroke="${color}" stroke-width="1.6" opacity="${opacity}">
        <path d="M34 66c-14 0-20-10-20-19 0-12 12-19 22-13 8 5 5 17-4 17-6 0-8-6-4-9"/>
        <circle cx="66" cy="30" r="4"/>
        <path d="M60 76c10-2 16-9 16-18"/>
      </g>
    </pattern>`;
  }
  if (type === 'damask') {
    return `<pattern id="${id}" width="72" height="72" patternUnits="userSpaceOnUse">
      <g fill="none" stroke="${color}" stroke-width="1.3" opacity="${opacity}">
        <path d="M36 8 64 36 36 64 8 36Z"/>
        <circle cx="36" cy="36" r="6"/>
        <path d="M36 18v-6M36 60v-6M18 36h-6M60 36h-6"/>
      </g>
    </pattern>`;
  }
  if (type === 'stripe') {
    return `<pattern id="${id}" width="26" height="26" patternUnits="userSpaceOnUse">
      <path d="M-6 26 26 -6M6 32 38 0" stroke="${color}" stroke-width="1.4" opacity="${opacity}" fill="none"/>
    </pattern>`;
  }
  if (type === 'dot') {
    return `<pattern id="${id}" width="34" height="34" patternUnits="userSpaceOnUse">
      <circle cx="8" cy="8" r="2.2" fill="${color}" opacity="${opacity}"/>
      <circle cx="25" cy="25" r="1.4" fill="${color}" opacity="${opacity * 0.8}"/>
    </pattern>`;
  }
  return `<pattern id="${id}" width="40" height="14" patternUnits="userSpaceOnUse">
    <path d="M0 3h40M0 10h40" stroke="${color}" stroke-width="1" opacity="${opacity}" fill="none"/>
  </pattern>`;
}

function garmentShape(category) {
  if (category === 'Sherwani') {
    return 'M400 206 C378 206 356 212 340 220 L296 236 L232 372 L286 410 L326 330 L312 886 L488 886 L474 330 L514 410 L568 372 L504 236 L460 220 C444 212 422 206 400 206 Z';
  }
  if (category === 'Formal Shirt') {
    return 'M400 210 C382 210 366 216 352 224 L306 240 L250 372 L300 404 L338 330 L330 806 L470 806 L462 330 L500 404 L550 372 L494 240 L448 224 C434 216 418 210 400 210 Z';
  }
  if (category === 'Casual Wear') {
    return 'M400 214 C380 214 362 220 348 228 L288 252 L246 344 L296 374 L332 312 L326 780 L474 780 L468 312 L504 374 L554 344 L512 252 L452 228 C438 220 420 214 400 214 Z';
  }
  if (category === 'Dhoti') {
    return 'M292 330 L508 330 L556 882 L300 882Z';
  }
  if (category === 'Festive Special') {
    return 'M400 208 C378 208 360 214 344 222 L300 238 L238 352 L292 392 L330 322 L316 846 L484 846 L470 322 L508 392 L562 352 L500 238 L456 222 C440 214 422 208 400 208 Z';
  }
  return 'M400 208 C378 208 360 214 344 222 L300 238 L238 352 L292 392 L330 322 L318 836 L482 836 L470 322 L508 392 L562 352 L500 238 L456 222 C440 214 422 208 400 208 Z';
}

function garmentDetails(category, accent, hem) {
  const parts = [];
  if (category === 'Sherwani') {
    parts.push(`<path d="M368 224 C384 258 416 258 432 224" fill="none" stroke="${accent}" stroke-width="3" opacity="0.9"/>`);
    parts.push(`<path d="M376 300 L376 ${hem - 16}" stroke="${accent}" stroke-width="2" opacity="0.5"/>`);
    parts.push(`<path d="M424 300 L424 ${hem - 16}" stroke="${accent}" stroke-width="2" opacity="0.5"/>`);
    for (let i = 0; i < 6; i += 1) parts.push(`<circle cx="400" cy="${330 + i * 78}" r="5" fill="${accent}" opacity="0.85"/>`);
    parts.push(`<path d="M330 560 h34 M436 560 h34" stroke="${accent}" stroke-width="2" opacity="0.35"/>`);
  } else if (category === 'Formal Shirt') {
    parts.push(`<path d="M360 218 L400 272 L440 218" fill="none" stroke="${accent}" stroke-width="2.4" opacity="0.8"/>`);
    parts.push(`<path d="M400 268 L400 ${hem - 24}" stroke="${accent}" stroke-width="1.8" opacity="0.55"/>`);
    for (let i = 0; i < 5; i += 1) parts.push(`<circle cx="400" cy="${318 + i * 96}" r="3.4" fill="${accent}" opacity="0.8"/>`);
    parts.push(`<rect x="330" y="372" width="42" height="52" rx="4" fill="none" stroke="${accent}" stroke-width="1.6" opacity="0.35"/>`);
  } else if (category === 'Casual Wear') {
    parts.push(`<path d="M352 230 C370 262 430 262 448 230" fill="none" stroke="${accent}" stroke-width="4" opacity="0.7"/>`);
    parts.push(`<path d="M344 700 h20 M436 700 h20" stroke="${accent}" stroke-width="2" opacity="0.3"/>`);
  } else if (category === 'Dhoti') {
    parts.push(`<rect x="286" y="304" width="228" height="34" rx="6" fill="${shade(accent, -40)}" opacity="0.7"/>`);
    for (let i = 0; i < 4; i += 1) {
      parts.push(`<path d="M${330 + i * 48} 344 C${318 + i * 48} 520 ${340 + i * 48} 700 ${322 + i * 48} 870" fill="none" stroke="${accent}" stroke-width="1.8" opacity="0.28"/>`);
    }
    parts.push(`<path d="M296 840 L556 840" stroke="${accent}" stroke-width="10" opacity="0.75"/>`);
  } else {
    parts.push(`<path d="M362 218 C372 190 428 190 438 218" fill="none" stroke="${accent}" stroke-width="3" opacity="0.85"/>`);
    parts.push(`<path d="M400 236 L400 ${hem - 40}" stroke="${accent}" stroke-width="1.8" opacity="0.6"/>`);
    for (let i = 0; i < 4; i += 1) parts.push(`<circle cx="400" cy="${310 + i * 120}" r="3.6" fill="${accent}" opacity="0.75"/>`);
    if (category === 'Festive Special') {
      parts.push(`<rect x="316" y="${hem - 40}" width="168" height="34" fill="none" stroke="${accent}" stroke-width="3" opacity="0.8"/>`);
      for (let i = 0; i < 9; i += 1) {
        parts.push(`<circle cx="${336 + i * 16}" cy="${hem - 23}" r="2.4" fill="${accent}" opacity="0.8"/>`);
      }
      parts.push(`<path d="M300 790 l8 12 -8 12 -8 -12Z" fill="${accent}" opacity="0.5"/>`);
      parts.push(`<path d="M500 790 l8 12 -8 12 -8 -12Z" fill="${accent}" opacity="0.5"/>`);
    }
    parts.push(`<path d="M292 392 L286 838 M508 392 L514 838" stroke="${accent}" stroke-width="1.2" opacity="0.25"/>`);
  }
  return parts.join('');
}

function productArtwork(product, index, options = {}) {
  const rng = makeRng(hashString(product.slug || product.name || String(index)));
  const tone = options.tone || product.tone || '#243a63';
  const accent = options.accent || product.accent || '#c9a84c';
  const category = product.category || 'Kurta';
  const patternType =
    category === 'Sherwani'
      ? 'damask'
      : category === 'Formal Shirt'
        ? 'stripe'
        : category === 'Casual Wear'
          ? 'dot'
          : category === 'Dhoti'
            ? 'weave'
            : 'paisley';
  const motifId = `motif-${index}`;
  const clothId = `cloth-${index}`;
  const haloId = `halo-${index}`;
  const hem = category === 'Sherwani' ? 886 : category === 'Formal Shirt' ? 806 : category === 'Casual Wear' ? 780 : category === 'Festive Special' ? 846 : category === 'Dhoti' ? 882 : 836;
  const body = garmentShape(category);
  const foldLines = Array.from({ length: 5 })
    .map(() => {
      const x = 330 + Math.floor(rng() * 130);
      return `<path d="M${x} 360 C${x - 12} 520 ${x + 16} 680 ${x - 4} ${hem - 30}" fill="none" stroke="#ffffff" stroke-opacity="0.07" stroke-width="8"/>`;
    })
    .join('');

  return svg(
    800,
    1000,
    `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${shade(tone, -86)}"/>
        <stop offset="0.55" stop-color="#0c1732"/>
        <stop offset="1" stop-color="#060b19"/>
      </linearGradient>
      <linearGradient id="${clothId}" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stop-color="${shade(tone, 18)}"/>
        <stop offset="0.6" stop-color="${tone}"/>
        <stop offset="1" stop-color="${shade(tone, -48)}"/>
      </linearGradient>
      <radialGradient id="${haloId}" cx="0.5" cy="0.45" r="0.55">
        <stop offset="0" stop-color="${accent}" stop-opacity="0.28"/>
        <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
      ${backgroundPattern(motifId, patternType, accent, 0.1)}
      <clipPath id="clip-${index}"><path d="${body}"/></clipPath>
    </defs>
    <rect width="800" height="1000" fill="url(#bg)"/>
    <rect width="800" height="1000" fill="url(#${motifId})" opacity="0.55"/>
    <circle cx="400" cy="470" r="360" fill="url(#${haloId})"/>
    <ellipse cx="400" cy="905" rx="210" ry="26" fill="#000000" opacity="0.35"/>
    <path d="${body}" fill="url(#${clothId})" stroke="${accent}" stroke-opacity="0.55" stroke-width="2.4"/>
    <g clip-path="url(#clip-${index})">
      <rect x="200" y="150" width="400" height="800" fill="url(#${motifId})" opacity="0.5"/>
      ${foldLines}
      <rect x="200" y="${hem - 150}" width="400" height="150" fill="#000000" opacity="0.16"/>
    </g>
    ${garmentDetails(category, accent, hem)}
    <g transform="translate(400 948)" opacity="0.55">
      <circle r="24" fill="none" stroke="${accent}" stroke-width="1.2"/>
      <text text-anchor="middle" y="8" font-family="Georgia, 'Times New Roman', serif" font-size="22" fill="${accent}">R</text>
    </g>
    <rect x="28" y="28" width="744" height="944" fill="none" stroke="${accent}" stroke-opacity="0.18"/>
    `
  );
}

for (const [index, product] of products.entries()) {
  fs.writeFileSync(path.join(productDir, `${product.slug}.svg`), productArtwork(product, index));
}

// Sale artwork
fs.writeFileSync(
  path.join(productDir, 'sale.svg'),
  productArtwork(
    { slug: 'sale', category: 'Festive Special', tone: '#7a2436', accent: '#f0d18a' },
    900
  ).replace(
    '<rect x="28" y="28" width="744" height="944"',
    '<path d="M120 250 L340 120 L470 240 L250 372Z" fill="#c9a84c" opacity="0.85"/><text x="300" y="255" font-family="Georgia, serif" font-size="34" fill="#0f1b3c" text-anchor="middle">SALE</text><rect x="28" y="28" width="744" height="944"'
  )
);

// Fabric swatches
const fabrics = [
  { tone: '#243a63', accent: '#c9a84c', label: 'weave-1' },
  { tone: '#5a1d26', accent: '#e0c37c', label: 'weave-2' },
  { tone: '#d9cfb6', accent: '#8d7238', label: 'weave-3' },
];
for (const [index, fabric] of fabrics.entries()) {
  const lines = Array.from({ length: 42 })
    .map((_, i) => `<path d="M0 ${i * 24} H800" stroke="${fabric.accent}" stroke-opacity="0.12" stroke-width="2"/>`)
    .join('');
  const warp = Array.from({ length: 22 })
    .map((_, i) => `<path d="M${i * 40} 0 V1000" stroke="#ffffff" stroke-opacity="0.05" stroke-width="12"/>`)
    .join('');
  fs.writeFileSync(
    path.join(fabricDir, `${fabric.label}.svg`),
    svg(
      800,
      1000,
      `<defs>
        <linearGradient id="f${index}" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stop-color="${shade(fabric.tone, 22)}"/>
          <stop offset="1" stop-color="${shade(fabric.tone, -40)}"/>
        </linearGradient>
      </defs>
      <rect width="800" height="1000" fill="url(#f${index})"/>
      ${lines}${warp}
      <rect x="40" y="40" width="720" height="920" fill="none" stroke="${fabric.accent}" stroke-opacity="0.45" stroke-width="2"/>
      <rect x="60" y="60" width="680" height="880" fill="none" stroke="${fabric.accent}" stroke-opacity="0.2" stroke-dasharray="2 10"/>
      <g transform="translate(400 500)" opacity="0.85">
        <circle r="120" fill="none" stroke="${fabric.accent}" stroke-opacity="0.4" stroke-width="1"/>
        <circle r="86" fill="none" stroke="${fabric.accent}" stroke-opacity="0.25" stroke-width="1"/>
        <text text-anchor="middle" y="16" font-family="Georgia, serif" font-size="64" fill="${fabric.accent}" opacity="0.85">R</text>
      </g>
      <text x="400" y="930" text-anchor="middle" font-family="Georgia, serif" font-size="18" letter-spacing="8" fill="${fabric.accent}" opacity="0.5">FABRIC</text>`
    )
  );
}

// Social / lookbook squares
const socialTones = [
  { tone: '#1d3268', accent: '#d8bb6a', category: 'Kurta', label: 'post-1' },
  { tone: '#5a1d26', accent: '#e2c47c', category: 'Sherwani', label: 'post-2' },
  { tone: '#6d7a63', accent: '#e7d9b1', category: 'Festive Special', label: 'post-3' },
  { tone: '#3a3f45', accent: '#c9a84c', category: 'Formal Shirt', label: 'post-4' },
];
for (const [index, post] of socialTones.entries()) {
  const body = garmentShape(post.category);
  const motif = backgroundPattern(`sp-${index}`, index === 1 ? 'damask' : 'paisley', post.accent, 0.14);
  fs.writeFileSync(
    path.join(socialDir, `${post.label}.svg`),
    svg(
      800,
      800,
      `<defs>
        <linearGradient id="s${index}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${shade(post.tone, -60)}"/>
          <stop offset="1" stop-color="${shade(post.tone, -110)}"/>
        </linearGradient>
        <radialGradient id="sg${index}" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stop-color="${post.accent}" stop-opacity="0.32"/>
          <stop offset="1" stop-color="${post.accent}" stop-opacity="0"/>
        </radialGradient>
        ${motif}
        <clipPath id="sc-${index}"><path d="${body}"/></clipPath>
      </defs>
      <rect width="800" height="800" fill="url(#s${index})"/>
      <rect width="800" height="800" fill="url(#sp-${index})" opacity="0.6"/>
      <circle cx="400" cy="390" r="330" fill="url(#sg${index})"/>
      <g transform="translate(0 -90) scale(0.82) translate(88 60)">
        <path d="${body}" fill="${shade(post.tone, 6)}" stroke="${post.accent}" stroke-opacity="0.6" stroke-width="3"/>
        <g clip-path="url(#sc-${index})"><rect width="800" height="1000" fill="url(#sp-${index})" opacity="0.55"/></g>
      </g>
      <rect x="26" y="26" width="748" height="748" fill="none" stroke="${post.accent}" stroke-opacity="0.3"/>
      <text x="400" y="742" text-anchor="middle" font-family="Georgia, serif" font-size="20" letter-spacing="10" fill="${post.accent}" opacity="0.65">LAHERI COLLECTION</text>`
    )
  );
}

// Hero banner
const heroGarments = [
  { x: 150, scale: 0.94, tone: '#1c2f5c', accent: '#d8bb6a', category: 'Kurta' },
  { x: 430, scale: 1.06, tone: '#5a1d26', accent: '#e3c67f', category: 'Sherwani' },
  { x: 730, scale: 0.88, tone: '#c9bfa6', accent: '#8a6b32', category: 'Kurta' },
  { x: 1000, scale: 1.0, tone: '#22392f', accent: '#d8bb6a', category: 'Festive Special' },
  { x: 1270, scale: 0.9, tone: '#2b3a45', accent: '#c9a84c', category: 'Formal Shirt' },
];
const heroClothes = heroGarments
  .map((item, index) => {
    const body = garmentShape(item.category);
    const pattern = backgroundPattern(`hm-${index}`, index % 2 ? 'damask' : 'paisley', item.accent, 0.16);
    return `<g transform="translate(${item.x} 300) scale(${item.scale * 0.7}) translate(-120 -60)">
      <defs>${pattern}<clipPath id="hc-${index}"><path d="${body}"/></clipPath></defs>
      <path d="${body}" fill="${item.tone}" stroke="${item.accent}" stroke-opacity="0.5" stroke-width="3"/>
      <g clip-path="url(#hc-${index})"><rect width="800" height="1000" fill="url(#hm-${index})" opacity="0.6"/></g>
      <path d="M400 208 L400 300" stroke="${item.accent}" stroke-opacity="0.55" stroke-width="2"/>
    </g>`;
  })
  .join('');

const hero = svg(
  1600,
  1000,
  `<defs>
    <linearGradient id="hbg" x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="#101f42"/>
      <stop offset="0.5" stop-color="#0a1430"/>
      <stop offset="1" stop-color="#050a17"/>
    </linearGradient>
    <radialGradient id="hglow" cx="0.62" cy="0.34" r="0.55">
      <stop offset="0" stop-color="#c9a84c" stop-opacity="0.36"/>
      <stop offset="1" stop-color="#c9a84c" stop-opacity="0"/>
    </radialGradient>
    ${backgroundPattern('hpat', 'paisley', '#c9a84c', 0.12)}
  </defs>
  <rect width="1600" height="1000" fill="url(#hbg)"/>
  <rect width="1600" height="1000" fill="url(#hpat)" opacity="0.7"/>
  <circle cx="980" cy="360" r="520" fill="url(#hglow)"/>
  <g stroke="#c9a84c" fill="none" opacity="0.28">
    <path d="M120 1000 V420 a180 180 0 0 1 360 0 V1000" stroke-width="2"/>
    <path d="M1180 1000 V470 a150 150 0 0 1 300 0 V1000" stroke-width="1.6"/>
    <path d="M0 250 H1600" stroke-width="1.2"/>
  </g>
  <g stroke="#d8bb6a" stroke-width="6" stroke-linecap="round" opacity="0.55">
    <path d="M80 300 H1520"/>
  </g>
  <g fill="#d8bb6a" opacity="0.5">
    ${heroGarments
      .map((item) => `<path d="M${item.x + 60} 300 v-42 a18 18 0 0 1 36 0 v42" fill="none" stroke="#d8bb6a" stroke-width="3"/>`)
      .join('')}
  </g>
  ${heroClothes}
  <g opacity="0.6">
    ${[0, 1, 2, 3]
      .map(
        (index) =>
          `<g transform="translate(${120 + index * 70} ${860 - index * 16})">
            <rect width="220" height="34" rx="8" fill="${['#1d3268', '#5a1d26', '#d9cfb6', '#4e5b3c'][index]}" opacity="0.9"/>
            <rect y="34" width="220" height="34" rx="8" fill="${['#243a63', '#6b2430', '#cabfa4', '#5c6b4f'][index]}" opacity="0.8"/>
            <rect y="68" width="220" height="34" rx="8" fill="${['#16264f', '#4d1a23', '#e2d8c0', '#3f4b34'][index]}" opacity="0.7"/>
            <path d="M0 20 H220M0 54 H220M0 88 H220" stroke="#c9a84c" stroke-opacity="0.15" stroke-width="2"/>
          </g>`
      )
      .join('')}
  </g>
  <g fill="#e8d5a3" opacity="0.5">
    <circle cx="1320" cy="200" r="3"/><circle cx="1180" cy="300" r="2"/><circle cx="1420" cy="420" r="2.4"/>
    <circle cx="880" cy="160" r="2"/><circle cx="760" cy="240" r="1.8"/>
  </g>
  <rect width="1600" height="1000" fill="url(#hbg)" opacity="0.18"/>
  `
);
fs.writeFileSync(path.join(imagesDir, 'hero.svg'), hero);

// Puzzle artwork (square, high contrast for tile matching)
const puzzlePattern = backgroundPattern('pz', 'damask', '#e8d5a3', 0.3);
const puzzleBody = garmentShape('Sherwani');
fs.writeFileSync(
  path.join(imagesDir, 'puzzle.svg'),
  svg(
    900,
    900,
    `<defs>
      <linearGradient id="pbg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#14264e"/>
        <stop offset="0.6" stop-color="#0c1730"/>
        <stop offset="1" stop-color="#060c1a"/>
      </linearGradient>
      <radialGradient id="pglow" cx="0.5" cy="0.4" r="0.6">
        <stop offset="0" stop-color="#c9a84c" stop-opacity="0.4"/>
        <stop offset="1" stop-color="#c9a84c" stop-opacity="0"/>
      </radialGradient>
      ${puzzlePattern}
      <clipPath id="pc"><path d="${puzzleBody}" transform="translate(50 0)"/></clipPath>
    </defs>
    <rect width="900" height="900" fill="url(#pbg)"/>
    <rect width="900" height="900" fill="url(#pz)" opacity="0.8"/>
    <circle cx="450" cy="400" r="400" fill="url(#pglow)"/>
    <g transform="translate(50 -20) scale(1.02)">
      <path d="${puzzleBody}" fill="#5a1d26" stroke="#e3c67f" stroke-width="4"/>
      <g clip-path="url(#pc)"><rect width="800" height="1000" fill="url(#pz)" opacity="0.7"/></g>
      <circle cx="400" cy="330" r="7" fill="#e3c67f"/><circle cx="400" cy="410" r="7" fill="#e3c67f"/>
      <circle cx="400" cy="490" r="7" fill="#e3c67f"/><circle cx="400" cy="570" r="7" fill="#e3c67f"/>
      <circle cx="400" cy="650" r="7" fill="#e3c67f"/>
    </g>
    <rect x="24" y="24" width="852" height="852" fill="none" stroke="#c9a84c" stroke-opacity="0.4" stroke-width="2"/>
    <text x="450" y="858" text-anchor="middle" font-family="Georgia, serif" font-size="20" letter-spacing="12" fill="#e8d5a3" opacity="0.6">LAHERI COLLECTION</text>`
  )
);

const files = fs.readdirSync(productDir).length + fs.readdirSync(fabricDir).length + fs.readdirSync(socialDir).length + 2;
console.log(`[assets] generated ${files} SVG files in client/public/images`);
