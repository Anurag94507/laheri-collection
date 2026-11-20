import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProduct } from '../api/index.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { telHref } from '../components/SendCodeLinks.jsx';
import Modal from '../components/Modal.jsx';
import ClothingRack from '../components/ClothingRack.jsx';
import QuickView from '../components/QuickView.jsx';
import { useCart } from '../store/cart.js';
import { useBagFx } from '../store/bagFx.js';
import { toast } from '../store/toast.js';
import { garmentGallery, garmentImage } from '../data/garments.js';
import { discountPercent, formatINR } from '../utils/format.js';
import { markBag, pointOverBag, tossToBag } from '../utils/toss.js';
import {
  IconArrowRight,
  IconCheck,
  IconClock,
  IconMinus,
  IconPlus,
  IconStar,
  IconTruck,
  IconWhatsApp,
} from '../components/Icons.jsx';

const SIZE_CHART = [
  { size: 'S', chest: 38, length: 40, shoulder: 16.5 },
  { size: 'M', chest: 40, length: 41, shoulder: 17 },
  { size: 'L', chest: 42, length: 42, shoulder: 17.5 },
  { size: 'XL', chest: 44, length: 43, shoulder: 18 },
  { size: 'XXL', chest: 46, length: 44, shoulder: 18.5 },
];

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const addItem = useCart((state) => state.addItem);
  const bump = useBagFx((state) => state.bump);
  const stageRef = useRef(null);
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [guideOpen, setGuideOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    getProduct(id)
      .then((data) => {
        if (!alive) return;
        setProduct(data.product);
        setRelated(data.related || []);
        setSize(data.product.sizes?.includes('L') ? 'L' : data.product.sizes?.[0] || 'Free Size');
        setActive(0);
        setQuantity(1);
      })
      .catch(() => alive && setError('This piece could not be found. It may have been sold.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="container-x grid gap-10 py-16 lg:grid-cols-2">
        <div className="aspect-[3/4] animate-pulse rounded bg-navy/5" />
        <div className="space-y-4">
          <div className="h-3 w-1/4 animate-pulse rounded bg-navy/5" />
          <div className="h-10 w-2/3 animate-pulse rounded bg-navy/5" />
          <div className="h-5 w-1/4 animate-pulse rounded bg-navy/5" />
          <div className="h-24 w-full animate-pulse rounded bg-navy/5" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container-x py-24 text-center">
        <p className="font-display text-4xl">{error || 'Product not found'}</p>
        <Link to="/collections" className="btn-navy mt-6">
          Back to collections
        </Link>
      </div>
    );
  }

  const off = discountPercent(product);
  const images = garmentGallery(product);
  const shop = settings?.shop;
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const waShare = `https://wa.me/?text=${encodeURIComponent(
    `Check this out from ${shop?.name || 'Laheri Collection'}: ${product.name} — ${shareUrl}`
  )}`;

  const collect = () => {
    if (Number(product.stock) <= 0) {
      toast.error('This piece is out of stock. Call the shop for the next batch.');
      return false;
    }
    addItem(product, size, quantity);
    bump();
    toast.success(`${product.name} (${size}) is in your bag.`);
    return true;
  };

  const add = async () => {
    const rect = stageRef.current?.getBoundingClientRect();
    await tossToBag({ image: garmentImage(product), rect });
    collect();
  };

  const buyNow = async () => {
    const added = await add();
    if (added !== false) navigate('/checkout');
  };

  return (
    <div>
      <div className="border-b border-navy/10">
        <div className="container-x flex items-center gap-2 overflow-hidden whitespace-nowrap py-3 text-[10px] uppercase tracking-[0.16em] text-ink/45">
          <Link to="/" className="flex-none hover:text-navy">Home</Link>
          <span className="flex-none">/</span>
          <Link to="/collections" className="flex-none hover:text-navy">Rack</Link>
          <span className="hidden flex-none sm:inline">/</span>
          <Link
            to={`/collections?category=${encodeURIComponent(product.category)}`}
            className="hidden flex-none hover:text-navy sm:inline"
          >
            {product.category}
          </Link>
          <span className="flex-none">/</span>
          <span className="truncate text-navy/70">{product.name}</span>
        </div>
      </div>

      <div className="container-x grid gap-9 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-12">
        {/* The garment hanging on its rail */}
        <div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <div className="flex gap-2 sm:flex-col">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`View ${index + 1}`}
                  className={`h-[74px] w-[58px] overflow-hidden border transition ${
                    active === index ? 'border-navy' : 'border-transparent opacity-55 hover:opacity-100'
                  }`}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            <div className="flex-1">
              <div className="relative pt-8">
                <span className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-navy/40">
                  <svg width="58" height="30" viewBox="0 0 58 30" fill="none" aria-hidden="true">
                    <path d="M29 2.5c0-1.4 1.1-2.5 2.5-2.5S34 1.1 34 2.5c0 1.9-2.2 2.1-3.3 3.1-.7.7-1 1.6-1 2.6v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M29.7 10.2 5.2 23.1a2 2 0 0 0 1 3.7h45.6a2 2 0 0 0 1-3.7L29.7 10.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </span>

                <motion.div
                  ref={stageRef}
                  drag
                  dragSnapToOrigin
                  dragElastic={0.16}
                  whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
                  onDrag={(_, info) => {
                    markBag(pointOverBag(info.point.x - window.scrollX, info.point.y - window.scrollY));
                  }}
                  onDragEnd={(_, info) => {
                    const over = pointOverBag(info.point.x - window.scrollX, info.point.y - window.scrollY);
                    markBag(false);
                    if (over) collect();
                  }}
                  className="garment-stage cursor-grab touch-none select-none"
                >
                  <img
                    src={images[active]}
                    alt={product.name}
                    draggable={false}
                    className="aspect-[3/4] w-full object-cover"
                  />
                  {off > 0 && <span className="badge absolute left-4 top-4 bg-clay text-cream">{off}% off</span>}
                </motion.div>
              </div>

              <p className="mt-3 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.22em] text-navy/40">
                <span className="h-1 w-1 rounded-full bg-clay" />
                Drag the piece into the bag
              </p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">
            {product.category} · {product.subcategory}
          </p>
          <h1 className="mt-2 font-display text-[40px] leading-[1.02] text-navy sm:text-[52px]">
            {product.name}
          </h1>

          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-gold">
              <IconStar size={13} filled />
              <span className="font-medium text-navy">{product.rating}</span>
            </span>
            <span className="text-ink/30">·</span>
            <span className="text-xs text-ink/45">{product.reviewCount} reviews</span>
            <span className="text-ink/30">·</span>
            <span className="text-xs text-ink/45">{product.fabric}</span>
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="font-display text-3xl text-navy">{formatINR(product.effectivePrice)}</span>
            {off > 0 && (
              <>
                <span className="text-xs text-ink/40 line-through">{formatINR(product.price)}</span>
                <span className="badge bg-clay/15 text-clay">{off}% off</span>
              </>
            )}
          </div>
          <p className="mt-1 text-[11px] text-ink/40">Inclusive of all taxes · GST invoice available</p>

          <div className="festive-divider my-6" />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="label mb-0">Select size</p>
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="text-[11px] font-medium text-navy/60 underline underline-offset-4 hover:text-navy"
              >
                Size guide
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(product.sizes || []).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSize(option)}
                  className={`h-11 min-w-[52px] rounded-full border px-3 text-sm transition ${
                    size === option ? 'border-navy bg-navy text-cream' : 'border-navy/20 text-navy/70 hover:border-navy'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex h-11 items-center rounded-full border border-navy/20">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="flex h-full w-10 items-center justify-center text-navy/60 hover:text-navy"
                aria-label="Decrease quantity"
              >
                <IconMinus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-medium">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(Number(product.stock) || 10, value + 1))}
                className="flex h-full w-10 items-center justify-center text-navy/60 hover:text-navy"
                aria-label="Increase quantity"
              >
                <IconPlus size={14} />
              </button>
            </div>
            <p className="text-xs text-ink/45">
              {product.stock > 0 ? `${product.stock} in stock` : 'Sold out'} · free alteration
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={add} disabled={Number(product.stock) <= 0} className="btn-navy">
              Throw in bag
            </button>
            <button type="button" onClick={buyNow} disabled={Number(product.stock) <= 0} className="btn-outline">
              Buy now <IconArrowRight size={14} />
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-navy/12 pt-4 text-xs text-ink/55">
            <p className="flex items-center gap-2">
              <IconTruck size={14} className="text-gold-dark" /> Delivery in 2–4 working days across UP · Free above ₹1,999
            </p>
            <p className="flex items-center gap-2">
              <IconClock size={14} className="text-gold-dark" /> Store pickup ready in 2 hours during shop hours
            </p>
            <p className="flex items-center gap-2">
              <IconCheck size={14} className="text-success" /> Exchange within 7 days with bill · no returns on sale items
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <a
              href={waShare}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-medium text-ink/55 transition hover:text-[#25D366]"
            >
              <IconWhatsApp size={14} /> Share on WhatsApp
            </a>
            <a href={telHref(shop?.phone)} className="text-xs font-medium text-ink/55 transition hover:text-navy">
              Call shop · {shop?.phone}
            </a>
          </div>

          <div className="mt-8 space-y-5 border-t border-navy/12 pt-6">
            <div>
              <p className="label">The piece</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/60">{product.description}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-navy/10 pt-4 text-xs">
              {[
                ['Fabric', product.fabric],
                ['Colours', (product.colors || []).join(', ')],
                ['Sizes', (product.sizes || []).join(', ')],
                ['Care', product.washCare],
              ].map(([label, value]) => (
                <div key={label} className={label === 'Care' ? 'col-span-2' : ''}>
                  <dt className="text-[10px] uppercase tracking-[0.16em] text-ink/40">{label}</dt>
                  <dd className="mt-1 leading-relaxed text-navy/75">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="border-t border-navy/10 py-12">
          <div className="container-x mb-2 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Complete the look</p>
              <h2 className="mt-2 font-display text-[32px] leading-tight">More on this rail</h2>
            </div>
            <Link
              to={`/collections?category=${encodeURIComponent(product.category)}`}
              className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/55 hover:text-navy sm:block"
            >
              All {product.category}
            </Link>
          </div>
          <ClothingRack products={related} onSelect={setSelected} ariaLabel="Related pieces rail" />
        </section>
      )}

      <QuickView product={selected} onClose={() => setSelected(null)} />

      <Modal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        title="Size guide"
        subtitle="All measurements in inches. Our tailor can adjust the fit free of charge."
      >
        <div className="overflow-hidden rounded-lg border border-navy/10">
          <table className="w-full text-sm">
            <thead className="bg-navy text-cream">
              <tr>
                {['Size', 'Chest', 'Length', 'Shoulder'].map((heading) => (
                  <th key={heading} className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.12em]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SIZE_CHART.map((row) => (
                <tr key={row.size} className="border-t border-navy/10">
                  <td className="px-3 py-2.5 font-semibold text-navy">{row.size}</td>
                  <td className="px-3 py-2.5 text-ink/60">{row.chest}"</td>
                  <td className="px-3 py-2.5 text-ink/60">{row.length}"</td>
                  <td className="px-3 py-2.5 text-ink/60">{row.shoulder}"</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink/50">
          Between two sizes? Choose the larger one — our in-house tailor will take it in free of charge within 3 days
          of purchase. For sherwanis, book a trial fitting by calling +91 {shop?.phone}.
        </p>
      </Modal>
    </div>
  );
}
