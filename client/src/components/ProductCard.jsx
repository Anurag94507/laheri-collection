import { Link } from 'react-router-dom';
import { discountPercent, formatINR } from '../utils/format.js';
import { useCart } from '../store/cart.js';
import { toast } from '../store/toast.js';
import { IconPlus, IconStar, IconWhatsApp } from './Icons.jsx';

export default function ProductCard({ product, showCompare = false, onCompare, compared = false, index = 0 }) {
  const addItem = useCart((state) => state.addItem);
  const off = discountPercent(product);
  const sizes = product.sizes || [];
  const defaultSize = sizes[0] || 'Free Size';

  const quickAdd = (event) => {
    event.preventDefault();
    addItem(product, defaultSize, 1);
    toast.success(`${product.name} added — size ${defaultSize}`);
  };

  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden rounded-2xl bg-navy/5">
        <Link to={`/collections/${product._id}`} className="block aspect-[4/5] overflow-hidden">
          <img
            src={product.images?.[0]}
            alt={product.name}
            loading={index < 4 ? 'eager' : 'lazy'}
            className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
          />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/35 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
        </Link>

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {off > 0 && <span className="badge bg-error text-white">{off}% off</span>}
          {product.isNewArrival && <span className="badge bg-surface/95 text-navy">New</span>}
          {Number(product.stock) < 5 && Number(product.stock) > 0 && (
            <span className="badge bg-navy/85 text-parchment">Only {product.stock} left</span>
          )}
        </div>

        <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-0 transition duration-300 group-hover:opacity-100 max-md:opacity-100">
          {showCompare && (
            <button
              type="button"
              onClick={() => onCompare?.(product)}
              className={`flex h-8 items-center rounded-full px-3 text-[10px] font-semibold uppercase tracking-wide shadow-sm transition ${
                compared ? 'bg-gold text-navy' : 'bg-white/95 text-navy/70 hover:bg-gold hover:text-navy'
              }`}
            >
              {compared ? 'Comparing' : 'Compare'}
            </button>
          )}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Check this out from Laheri Collection: ${product.name} — ${typeof window !== 'undefined' ? window.location.origin : ''}/collections/${product._id}`)}`}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#25D366] shadow-sm transition hover:bg-[#25D366] hover:text-white"
            aria-label={`Share ${product.name} on WhatsApp`}
          >
            <IconWhatsApp size={15} />
          </a>
        </div>

        <button
          type="button"
          onClick={quickAdd}
          className="absolute inset-x-3 bottom-3 flex translate-y-3 items-center justify-center gap-2 rounded-full bg-gold py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-navy opacity-0 shadow-lift transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 hover:bg-gold-light max-md:translate-y-0 max-md:opacity-100"
        >
          <IconPlus size={14} strokeWidth={2.4} /> Quick add · {defaultSize}
        </button>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] uppercase tracking-[0.18em] text-ink/40">
            {product.fabric} · {product.category}
          </p>
          <Link to={`/collections/${product._id}`} className="mt-1 block font-display text-[20px] leading-tight text-navy transition hover:text-gold-dark">
            {product.name}
          </Link>
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-ink/50">
            <IconStar size={12} filled className="text-gold" />
            <span>{product.rating}</span>
            <span className="text-ink/30">({product.reviewCount})</span>
          </div>
        </div>
        <div className="flex-none text-right">
          <p className="text-sm font-semibold text-navy">{formatINR(product.effectivePrice)}</p>
          {off > 0 && <p className="text-[11px] text-ink/35 line-through">{formatINR(product.price)}</p>}
        </div>
      </div>
    </article>
  );
}
