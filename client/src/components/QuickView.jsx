import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { garmentImage } from '../data/garments.js';
import { useCart } from '../store/cart.js';
import { useBagFx } from '../store/bagFx.js';
import { toast } from '../store/toast.js';
import { discountPercent, formatINR } from '../utils/format.js';
import { markBag, pointOverBag, tossToBag } from '../utils/toss.js';
import { IconArrowRight, IconClose, IconMinus, IconPlus, IconStar } from './Icons.jsx';

/**
 * The sheet that opens when a garment on the rail is clicked. The photograph
 * itself can be dragged (or thrown with the button) straight into the bag.
 */
export default function QuickView({ product, onClose }) {
  const addItem = useCart((state) => state.addItem);
  const bump = useBagFx((state) => state.bump);
  const stageRef = useRef(null);
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!product) return;
    const sizes = product.sizes || [];
    setSize(sizes.includes('L') ? 'L' : sizes[0] || 'Free Size');
    setQuantity(1);
  }, [product]);

  useEffect(() => {
    if (!product) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [product, onClose]);

  const collect = (chosenSize = size) => {
    if (Number(product.stock) <= 0) {
      toast.error('This piece is out of stock. Call the shop for the next batch.');
      return false;
    }
    addItem(product, chosenSize, quantity);
    bump();
    toast.success(`${product.name} (${chosenSize}) is in your bag.`);
    return true;
  };

  const throwIntoBag = async () => {
    const rect = stageRef.current?.getBoundingClientRect();
    await tossToBag({ image: garmentImage(product), rect });
    collect();
  };

  const off = product ? discountPercent(product) : 0;

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-end justify-center bg-navy/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={product.name}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-lift sm:rounded-3xl sm:p-8"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-navy/15 bg-cream/80 text-navy transition hover:bg-navy hover:text-cream"
            >
              <IconClose size={16} />
            </button>

            <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-10">
              <div>
                <motion.div
                  ref={stageRef}
                  drag
                  dragSnapToOrigin
                  dragElastic={0.16}
                  whileDrag={{ scale: 1.03, cursor: 'grabbing' }}
                  onDragStart={() => setDragging(true)}
                  onDrag={(_, info) => {
                    markBag(pointOverBag(info.point.x - window.scrollX, info.point.y - window.scrollY));
                  }}
                  onDragEnd={(_, info) => {
                    setDragging(false);
                    const over = pointOverBag(info.point.x - window.scrollX, info.point.y - window.scrollY);
                    markBag(false);
                    if (over) collect();
                  }}
                  className="garment-stage cursor-grab touch-none select-none p-3"
                >
                  <img
                    src={garmentImage(product)}
                    alt={product.name}
                    width="720"
                    height="960"
                    draggable={false}
                    className="mx-auto aspect-[3/4] w-full max-w-[320px] object-cover"
                  />
                </motion.div>
                <p className="mt-3 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-navy/40">
                  <span className="h-1 w-1 rounded-full bg-clay" />
                  Drag the piece into the bag
                </p>
              </div>

              <div className="flex flex-col">
                <p className="eyebrow">
                  {product.category} · {product.fabric}
                </p>
                <h2 className="mt-2 font-display text-[34px] leading-[1.05] text-navy sm:text-[42px]">
                  {product.name}
                </h2>

                <div className="mt-3 flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 text-gold">
                    <IconStar size={13} filled />
                    <span className="font-medium text-navy">{product.rating}</span>
                  </span>
                  <span className="text-ink/30">·</span>
                  <span className="text-xs text-ink/45">{product.reviewCount} reviews</span>
                </div>

                <div className="mt-4 flex items-baseline gap-3">
                  <span className="font-display text-2xl text-navy">{formatINR(product.effectivePrice)}</span>
                  {off > 0 && (
                    <>
                      <span className="text-xs text-ink/40 line-through">{formatINR(product.price)}</span>
                      <span className="badge bg-clay/15 text-clay">{off}% off</span>
                    </>
                  )}
                </div>

                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-ink/60">{product.description}</p>

                <div className="mt-5">
                  <p className="label">Size</p>
                  <div className="flex flex-wrap gap-2">
                    {(product.sizes || []).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSize(option)}
                        className={`h-10 min-w-[48px] rounded-full border px-3 text-xs transition ${
                          size === option ? 'border-navy bg-navy text-cream' : 'border-navy/20 text-navy/70 hover:border-navy'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 items-center rounded-full border border-navy/20">
                    <button
                      type="button"
                      onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                      className="flex h-full w-9 items-center justify-center text-navy/60 hover:text-navy"
                      aria-label="Decrease quantity"
                    >
                      <IconMinus size={13} />
                    </button>
                    <span className="w-7 text-center text-sm">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((value) => Math.min(Number(product.stock) || 10, value + 1))}
                      className="flex h-full w-9 items-center justify-center text-navy/60 hover:text-navy"
                      aria-label="Increase quantity"
                    >
                      <IconPlus size={13} />
                    </button>
                  </div>
                  <p className="text-[11px] text-ink/45">In stock · free alteration</p>
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={throwIntoBag} className="btn-navy flex-1">
                    Throw in bag
                  </button>
                  <Link to={`/collections/${product._id}`} className="btn-outline flex-1">
                    Full details <IconArrowRight size={14} />
                  </Link>
                </div>

                <p className="mt-4 text-[11px] leading-relaxed text-ink/40">
                  Prefer to feel the fabric? Walk into the shop — free alterations within 3 days.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
