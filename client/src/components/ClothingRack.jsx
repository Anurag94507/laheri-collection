import { useCallback, useEffect, useRef, useState } from 'react';
import { garmentImage } from '../data/garments.js';
import { formatINR } from '../utils/format.js';
import { IconArrowLeft, IconArrowRight } from './Icons.jsx';

function Hanger() {
  return (
    <svg width="54" height="28" viewBox="0 0 58 30" fill="none" aria-hidden="true">
      <path d="M29 2.5c0-1.4 1.1-2.5 2.5-2.5S34 1.1 34 2.5c0 1.9-2.2 2.1-3.3 3.1-.7.7-1 1.6-1 2.6v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M29.7 10.2 5.2 23.1a2 2 0 0 0 1 3.7h45.6a2 2 0 0 0 1-3.7L29.7 10.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The garment rail: native horizontal scroll with snap points, hangers that
 * travel with the shopper. Whichever piece reaches the middle of the rail
 * steps forward and its neighbours sit back slightly. Every garment is a real
 * button, so the whole rail is reachable by keyboard and by swipe.
 */
export default function ClothingRack({ products = [], onSelect, ariaLabel = 'Clothing rail' }) {
  const rootRef = useRef(null);
  const trackRef = useRef(null);
  const itemRefs = useRef([]);
  const frame = useRef(0);
  const [front, setFront] = useState(0);
  const [armed, setArmed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const centre = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    let nearestDistance = Infinity;

    itemRefs.current.forEach((item, index) => {
      if (!item) return;
      const middle = item.offsetLeft + item.offsetWidth / 2;
      const distance = Math.min(Math.abs(middle - centre) / (track.clientWidth * 0.5), 1);
      item.style.setProperty('--d', distance.toFixed(3));
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    });

    setFront(nearest);
    setEdges({
      start: track.scrollLeft <= 4,
      end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track) return undefined;

    const onScroll = () => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(measure);
    };
    const onResize = () => measure();

    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame.current);
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [measure, products.length]);

  // A single controlled crop reveal as the rail comes into view. The hidden
  // state is only applied once JS is running, so the rail still renders if
  // the observer never fires.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !products.length) return undefined;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return undefined;
    }
    setArmed(true);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.12 }
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [products.length]);

  const step = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const item = track.querySelector('.rack-item');
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || '16') || 16;
    const distance = item ? item.offsetWidth + gap : Math.round(track.clientWidth * 0.8);
    track.scrollBy({ left: direction * distance, behavior: 'smooth' });
  };

  const onKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const target = event.key === 'ArrowRight' ? front + 1 : front - 1;
    const node = itemRefs.current[Math.min(products.length - 1, Math.max(0, target))];
    if (!node) return;
    event.preventDefault();
    node.focus({ preventScroll: true });
    node.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  if (!products.length) return null;

  return (
    <div
      ref={rootRef}
      className={`rack ${armed ? 'is-arming' : ''} ${revealed ? 'is-in' : ''}`}
      role="region"
      aria-label={ariaLabel}
    >
      <div className="rack-rail" aria-hidden="true" />
      <div
        className="rack-track hide-scrollbar"
        ref={trackRef}
        onScroll={measure}
        onKeyDown={onKeyDown}
      >
        {products.map((product, index) => (
          <button
            key={product._id || product.name}
            type="button"
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            onFocus={(event) => {
              setFront(index);
              event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }}
            onClick={() => onSelect?.(product)}
            aria-label={`${product.name}, ${formatINR(product.effectivePrice)}. Open quick view`}
            className="rack-item group"
            style={{ '--i': index }}
          >
            <span className="rack-hanger" aria-hidden="true">
              <Hanger />
            </span>
            <span className="rack-garment">
              <img
                src={garmentImage(product)}
                alt={`${product.name} — ${product.fabric} ${product.category} at Laheri Collection`}
                width="720"
                height="960"
                loading={index < 2 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </span>
            <span className="rack-label">
              <span className="rack-name">{product.name}</span>
              <span className="rack-price">{formatINR(product.effectivePrice)}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="container-x mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <p className="text-[10px] uppercase tracking-[0.24em] text-ink/40">
          <span className="hidden sm:inline">Slide the hangers · click a piece to try it</span>
          <span className="sm:hidden">Swipe the rail</span>
        </p>
        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={edges.start}
            aria-label="Previous garments on the rail"
            className="rack-control"
          >
            <IconArrowLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={edges.end}
            aria-label="Next garments on the rail"
            className="rack-control"
          >
            <IconArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
