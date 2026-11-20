import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { discountPercent, formatINR } from '../utils/format.js';
import { garmentImage, garmentSecondImage } from '../data/garments.js';
import { useCart } from '../store/cart.js';
import { useBagFx } from '../store/bagFx.js';
import { toast } from '../store/toast.js';
import { tossToBag } from '../utils/toss.js';
import { IconBag, IconStar } from './Icons.jsx';

/**
 * Editorial product card: portrait photograph, a second look on hover and a
 * Quick View action. `onQuickView` opens the same detail sheet the rail uses.
 */
export default function ProductCard({ product, onQuickView, showCompare = false, onCompare, compared = false, index = 0 }) {
  const addItem = useCart((state) => state.addItem);
  const bump = useBagFx((state) => state.bump);
  const imageRef = useRef(null);
  const off = discountPercent(product);
  const sizes = product.sizes || [];
  const defaultSize = sizes[0] || 'Free Size';
  const second = garmentSecondImage(product);

  const quickAdd = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = imageRef.current?.getBoundingClientRect();
    await tossToBag({ image: garmentImage(product), rect });
    addItem(product, defaultSize, 1);
    bump();
    toast.success(`${product.name} — size ${defaultSize} is in your bag.`);
  };

  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden bg-[#f4eadf] shadow-[0_18px_34px_-30px_rgba(61,0,15,0.55)]">
        <Link
          to={`/collections/${product._id}`}
          className="block aspect-[3/4] overflow-hidden"
          aria-label={`View ${product.name}`}
        >
          <img
            ref={imageRef}
            src={garmentImage(product)}
            alt={`${product.name} — ${product.fabric} ${product.category} at Laheri Collection`}
            width="720"
            height="960"
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition-all duration-[1100ms] ease-out group-hover:scale-[1.04] ${
              second ? 'group-hover:opacity-0' : ''
            }`}
          />
          {second && (
            <img
              src={second}
              alt={`${product.name} — alternate view of the garment`}
              width="720"
              height="960"
              loading="lazy"
              decoding="async"
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-[900ms] ease-out group-hover:scale-[1.04] group-hover:opacity-100"
            />
          )}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/30 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
        </Link>

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {off > 0 && <span className="badge bg-gold text-navy">{off}% off</span>}
          {product.isNewArrival && <span className="badge bg-cream/95 text-navy">New arrival</span>}
          {Number(product.stock) < 5 && Number(product.stock) > 0 && (
            <span className="badge bg-navy text-cream">Only {product.stock} left</span>
          )}
        </div>

        {showCompare && (
          <button
            type="button"
            onClick={() => onCompare?.(product)}
            className={`absolute right-3 top-3 flex h-7 items-center rounded-full px-3 text-[9px] font-semibold uppercase tracking-[0.14em] transition ${
              compared ? 'bg-navy text-cream' : 'bg-cream/90 text-navy/70 hover:bg-navy hover:text-cream'
            }`}
          >
            {compared ? 'Comparing' : 'Compare'}
          </button>
        )}

        <div className="absolute inset-x-2 bottom-2 flex translate-y-2 items-center gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 max-md:translate-y-0 max-md:opacity-100">
          <button
            type="button"
            onClick={() => onQuickView?.(product)}
            className="flex-1 rounded-full bg-cream/95 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-navy shadow-soft backdrop-blur transition hover:bg-navy hover:text-cream"
          >
            Quick view
          </button>
          <button
            type="button"
            onClick={quickAdd}
            aria-label={`Add ${product.name} to bag`}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-navy text-cream shadow-soft transition hover:bg-gold hover:text-navy"
          >
            <IconBag size={15} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[9px] uppercase tracking-[0.22em] text-ink/45">
            {product.category} · {product.fabric}
          </p>
          <Link
            to={`/collections/${product._id}`}
            className="mt-1 block font-display text-[19px] leading-tight text-navy transition hover:text-gold-dark"
          >
            {product.name}
          </Link>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-ink/50">
            <IconStar size={11} filled className="text-gold" />
            <span>{product.rating}</span>
            <span className="text-ink/30">({product.reviewCount})</span>
          </div>
        </div>
        <div className="flex-none text-right">
          <p className="text-[13px] font-semibold text-navy">{formatINR(product.effectivePrice)}</p>
          {off > 0 && <p className="text-[11px] text-ink/35 line-through">{formatINR(product.price)}</p>}
        </div>
      </div>
    </article>
  );
}
