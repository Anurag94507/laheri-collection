import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getProduct } from '../api/index.js';
import { useSettings } from '../context/SettingsContext.jsx';
import ProductCard from '../components/ProductCard.jsx';
import Modal from '../components/Modal.jsx';
import { useCart } from '../store/cart.js';
import { toast } from '../store/toast.js';
import { discountPercent, formatINR } from '../utils/format.js';
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
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const [guideOpen, setGuideOpen] = useState(false);

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
        <div className="aspect-[4/5] animate-pulse rounded-2xl bg-navy/5" />
        <div className="space-y-4">
          <div className="h-4 w-1/4 animate-pulse rounded bg-navy/5" />
          <div className="h-10 w-2/3 animate-pulse rounded bg-navy/5" />
          <div className="h-6 w-1/4 animate-pulse rounded bg-navy/5" />
          <div className="h-24 w-full animate-pulse rounded bg-navy/5" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container-x py-24 text-center">
        <p className="font-display text-4xl">{error || 'Product not found'}</p>
        <Link to="/collections" className="btn-navy mt-6">Back to collections</Link>
      </div>
    );
  }

  const off = discountPercent(product);
  const images = product.images?.length ? product.images : ['/images/products/kurta-royal.svg'];
  const shop = settings?.shop;
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const waShare = `https://wa.me/?text=${encodeURIComponent(`Check this out from ${shop?.name || 'Laheri Collection'}: ${product.name} — ${shareUrl}`)}`;

  const add = () => {
    if (Number(product.stock) <= 0) {
      toast.error('This piece is out of stock. Call the shop for the next batch.');
      return;
    }
    addItem(product, size, quantity);
    toast.success(`${product.name} (${size}) added to bag.`);
  };

  const buyNow = () => {
    add();
    navigate('/checkout');
  };

  return (
    <div>
      <div className="border-b border-navy/10 bg-white/60">
        <div className="container-x flex items-center gap-2 py-4 text-[11px] text-ink/45">
          <Link to="/" className="hover:text-navy">Home</Link>
          <span>/</span>
          <Link to="/collections" className="hover:text-navy">Collections</Link>
          <span>/</span>
          <Link to={`/collections?category=${encodeURIComponent(product.category)}`} className="hover:text-navy">{product.category}</Link>
          <span>/</span>
          <span className="truncate text-navy/70">{product.name}</span>
        </div>
      </div>

      <div className="container-x grid gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        {/* Gallery */}
        <div className="flex flex-col-reverse gap-4 sm:flex-row">
          <div className="flex gap-3 sm:flex-col">
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActive(index)}
                className={`h-20 w-16 overflow-hidden rounded-lg border-2 transition ${
                  active === index ? 'border-gold' : 'border-transparent opacity-65 hover:opacity-100'
                }`}
              >
                <img src={image} alt={`${product.name} view ${index + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>

          <div
            className="relative flex-1 cursor-zoom-in overflow-hidden rounded-2xl bg-navy/5"
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const x = ((event.clientX - rect.left) / rect.width) * 100;
              const y = ((event.clientY - rect.top) / rect.height) * 100;
              setOrigin(`${x}% ${y}%`);
            }}
          >
            <img
              src={images[active]}
              alt={product.name}
              className="aspect-[4/5] w-full object-cover transition-transform duration-300"
              style={{ transform: zoom ? 'scale(1.8)' : 'scale(1)', transformOrigin: origin }}
            />
            {off > 0 && <span className="badge absolute left-4 top-4 bg-error text-white">{off}% off</span>}
            <span className="absolute bottom-4 right-4 rounded-full bg-navy/70 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-parchment/70 backdrop-blur">
              Hover to zoom
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">{product.category} · {product.subcategory}</p>
          <h1 className="mt-2 text-[38px] leading-[1.02] sm:text-[44px]">{product.name}</h1>

          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-gold">
              <IconStar size={14} filled />
              <span className="font-medium text-navy">{product.rating}</span>
            </span>
            <span className="text-ink/35">·</span>
            <span className="text-ink/45">{product.reviewCount} reviews</span>
            <span className="text-ink/35">·</span>
            <span className={`text-xs font-medium ${Number(product.stock) > 0 ? 'text-success' : 'text-error'}`}>
              {Number(product.stock) > 0 ? `In stock (${product.stock})` : 'Sold out'}
            </span>
          </div>

          <div className="mt-5 flex items-end gap-3">
            <span className="font-display text-[34px] leading-none text-navy">{formatINR(product.effectivePrice)}</span>
            {off > 0 && (
              <>
                <span className="text-sm text-ink/35 line-through">{formatINR(product.price)}</span>
                <span className="badge bg-success/10 text-success">Save {formatINR(product.price - product.effectivePrice)}</span>
              </>
            )}
          </div>
          <p className="mt-1 text-[11px] text-ink/40">Inclusive of all taxes · GST invoice available</p>

          <div className="festive-divider my-6" />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/55">Select size</p>
              <button type="button" onClick={() => setGuideOpen(true)} className="text-[11px] font-medium text-gold-dark underline underline-offset-4">
                Size guide
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(product.sizes || []).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSize(option)}
                  className={`h-11 min-w-[52px] rounded-lg border px-3 text-sm transition ${
                    size === option ? 'border-navy bg-navy text-surface' : 'border-navy/15 text-navy/70 hover:border-gold'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex h-11 items-center rounded-lg border border-navy/15">
              <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-full w-10 items-center justify-center text-navy/60 hover:text-navy" aria-label="Decrease quantity">
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
              {product.fabric} · Free alteration within 3 days
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={add} disabled={Number(product.stock) <= 0} className="btn-navy">
              Add to bag
            </button>
            <button type="button" onClick={buyNow} disabled={Number(product.stock) <= 0} className="btn-gold">
              Buy now <IconArrowRight size={15} />
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-2 rounded-xl border border-navy/10 bg-white p-4 text-xs text-ink/55">
            <p className="flex items-center gap-2"><IconTruck size={15} className="text-gold-dark" /> Delivery in {shop?.hours ? '2–4 working days' : '2–4 working days'} across UP · Free above ₹1,999</p>
            <p className="flex items-center gap-2"><IconClock size={15} className="text-gold-dark" /> Store pickup ready in 2 hours during shop hours</p>
            <p className="flex items-center gap-2"><IconCheck size={15} className="text-success" /> Exchange within 7 days with bill · no returns on sale items</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <a href={waShare} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-medium text-ink/55 transition hover:text-[#25D366]">
              <IconWhatsApp size={15} /> Share on WhatsApp
            </a>
            <a href={`tel:+91${shop?.phone || ''}`} className="text-xs font-medium text-ink/55 transition hover:text-navy">
              Call shop · +91 {shop?.phone}
            </a>
          </div>

          <div className="mt-8 space-y-5 border-t border-navy/10 pt-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/55">The piece</p>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{product.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">Fabric</p>
                <p className="mt-1 font-medium text-navy/80">{product.fabric}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">Colours</p>
                <p className="mt-1 font-medium text-navy/80">{(product.colors || []).join(', ')}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40">Wash & care</p>
                <p className="mt-1 leading-relaxed text-ink/55">{product.washCare}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="container-x py-14">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Complete the look</p>
              <h2 className="mt-2 text-[32px]">You may also like</h2>
            </div>
            <Link to={`/collections?category=${encodeURIComponent(product.category)}`} className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-navy/55 hover:text-gold-dark sm:block">
              All {product.category}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {related.map((item, index) => (
              <ProductCard key={item._id} product={item} index={index} />
            ))}
          </div>
        </section>
      )}

      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="Size guide" subtitle="All measurements in inches. Our tailor can adjust the fit free of charge.">
        <div className="overflow-hidden rounded-lg border border-navy/10">
          <table className="w-full text-sm">
            <thead className="bg-navy text-surface">
              <tr>
                {['Size', 'Chest', 'Length', 'Shoulder'].map((heading) => (
                  <th key={heading} className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.12em]">{heading}</th>
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
