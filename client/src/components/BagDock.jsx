import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cartCount, useCart } from '../store/cart.js';
import { useBagFx } from '../store/bagFx.js';
import { IconBag } from './Icons.jsx';

/**
 * The floating bag that every garment is thrown into. It is also the drop
 * target for drag gestures, and it pops whenever something lands inside.
 */
export default function BagDock() {
  const { items } = useCart();
  const pulse = useBagFx((state) => state.pulse);
  const [popping, setPopping] = useState(false);
  const count = cartCount(items);

  useEffect(() => {
    if (!pulse) return undefined;
    setPopping(true);
    const timer = window.setTimeout(() => setPopping(false), 680);
    return () => window.clearTimeout(timer);
  }, [pulse]);

  return (
    <Link
      to="/cart"
      data-bag-drop
      aria-label={`Open bag, ${count} ${count === 1 ? 'item' : 'items'}`}
      className={`fixed bottom-40 right-4 z-[70] flex items-center gap-3 rounded-full border border-navy/15 bg-cream/95 px-4 py-3 text-navy shadow-lift backdrop-blur md:bottom-24 md:right-6 ${
        popping ? 'animate-bag-pop' : ''
      }`}
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-navy text-cream">
        <IconBag size={17} />
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-navy">
            {count}
          </span>
        )}
      </span>
      <span className="hidden text-[11px] uppercase tracking-[0.2em] md:block">Bag</span>
    </Link>
  );
}
