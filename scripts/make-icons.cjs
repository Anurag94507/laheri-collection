/**
 * Generates the Laheri Collection app icons (PNG) with no external deps.
 * Art: navy radial field, double gold ring, gold "L" monogram + diamond accents.
 * Run: node scripts/make-icons.cjs
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ---------- minimal PNG encoder ---------- */
const CRC_TABLE = (() => {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- colour helpers ---------- */
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const NAVY_LIGHT = hex('#1B2B57');
const NAVY_DEEP = hex('#0B1430');
const GOLD_LIGHT = hex('#F3E3AE');
const GOLD_MID = hex('#C9A84C');
const GOLD_DARK = hex('#8E6F26');

const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const goldAt = (u, v) => {
  const t = clamp01((u * 0.35 + v * 0.65 - 0.18) / 0.72);
  return t < 0.5 ? mix(GOLD_LIGHT, GOLD_MID, t / 0.5) : mix(GOLD_MID, GOLD_DARK, (t - 0.5) / 0.5);
};

/* ---------- shape sampling ---------- */
// Returns the composited colour (or null for "keep background") at unit coords.
function sampleArt(u, v) {
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  const dx = u - 0.5;
  const dy = v - 0.5;
  const r = Math.hypot(dx, dy);

  // double ring
  if (Math.abs(r - 0.472) < 0.0065) return { color: goldAt(u, v), alpha: 1 };
  if (Math.abs(r - 0.437) < 0.0028) return { color: goldAt(u, v), alpha: 0.5 };

  // diamond accents (top + bottom)
  const diamond = (cy) => Math.abs(u - 0.5) * 1.15 + Math.abs(v - cy) < 0.03;
  if (diamond(0.145) || diamond(0.855)) return { color: goldAt(u, v), alpha: 0.95 };

  // "L" monogram
  const stem = u > 0.392 && u < 0.452 && v > 0.305 && v < 0.668;
  const foot = u > 0.392 && u < 0.607 && v > 0.612 && v < 0.668;
  if (stem || foot) return { color: goldAt(u, v), alpha: 1 };

  // hairline under the monogram
  if (Math.abs(v - 0.705) < 0.0016 && u > 0.36 && u < 0.64) return { color: goldAt(u, v), alpha: 0.55 };

  return null;
}

function render(size, artScale = 1) {
  const ss = 4; // supersampling factor for smooth edges
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const u = (x + (sx + 0.5) / ss) / size;
          const v = (y + (sy + 0.5) / ss) / size;
          // background radial field
          const d = Math.hypot(u - 0.36, v - 0.3) / 0.95;
          let base = mix(NAVY_LIGHT, NAVY_DEEP, clamp01(d));
          // map into art space (maskable icons shrink the art)
          const au = (u - 0.5) / artScale + 0.5;
          const av = (v - 0.5) / artScale + 0.5;
          const art = sampleArt(au, av);
          if (art) base = mix(base, art.color, art.alpha);
          r += base[0];
          g += base[1];
          b += base[2];
          a += 255;
        }
      }
      const total = ss * ss;
      const i = (y * size + x) * 4;
      out[i] = Math.round(r / total);
      out[i + 1] = Math.round(g / total);
      out[i + 2] = Math.round(b / total);
      out[i + 3] = Math.round(a / total);
    }
  }
  return out;
}

const outDir = path.join(__dirname, '..', 'client', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192, scale: 1 },
  { file: 'icon-512.png', size: 512, scale: 1 },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.66 },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.9 },
];

for (const t of targets) {
  const png = encodePng(t.size, t.size, render(t.size, t.scale));
  fs.writeFileSync(path.join(outDir, t.file), png);
  console.log(`${t.file}  ${t.size}x${t.size}  ${(png.length / 1024).toFixed(1)} KB`);
}
