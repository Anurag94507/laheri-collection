import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCategories, getProducts } from '../api/index.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { useChat } from '../store/chat.js';
import ProductCard from '../components/ProductCard.jsx';
import SectionHead from '../components/SectionHead.jsx';
import {
  IconArrowRight,
  IconGift,
  IconInstagram,
  IconPuzzle,
  IconSparkles,
  IconStar,
  IconWhatsApp,
} from '../components/Icons.jsx';

const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] },
};

const marqueeItems = [
  'Free alterations in 3 days',
  'Sherwani fittings by appointment',
  'Wedding season collection',
  'Cash · UPI · Cards',
  'Delivery across Uttar Pradesh',
  'Since 1998',
];

export default function Home() {
  const { settings } = useSettings();
  const { openChat } = useChat();
  const [categories, setCategories] = useState([]);
  const [arrivals, setArrivals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([getProducts({ newArrival: 'true', limit: 8, sort: 'newest' }), getCategories()])
      .then(([productData, categoryData]) => {
        if (!alive) return;
        setArrivals(productData.items || []);
        setCategories(categoryData || []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const shop = settings?.shop;
  const offers = settings?.offers;
  const testimonials = settings?.testimonials || [];
  const posts =
    settings?.social?.posts?.length > 0
      ? settings.social.posts
      : [
          { image: '/images/social/post-1.svg', caption: 'Indigo cotton for the evening pooja.' },
          { image: '/images/social/post-2.svg', caption: 'Maroon velvet, groom-ready.' },
          { image: '/images/social/post-3.svg', caption: 'Festive threads, straight off the shelf.' },
          { image: '/images/social/post-4.svg', caption: 'Charcoal checks for the boardroom.' },
        ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy">
        <img src="/images/hero.svg" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-navy/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/10 to-navy/40" />

        <div className="container-x relative flex min-h-[84vh] flex-col justify-center py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-gold" />
              <p className="eyebrow">Lucknow · Since {shop?.established || 1998}</p>
            </div>

            <h1 className="mt-6 font-display text-[52px] leading-[0.92] text-surface sm:text-[72px] lg:text-[84px]">
              <span className="shimmer-text">{shop?.name || 'Raja Menswear'}</span>
              <span className="mt-3 block font-display text-[24px] font-light italic leading-tight text-parchment/85 sm:text-[30px]">
                {shop?.tagline || 'Dressed for every occasion — walk in or order online'}
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-sm leading-relaxed text-parchment/60 sm:text-base">
              Sherwanis for the wedding, kurtas for the festival, shirts for Monday morning. Three decades of
              fabric knowledge, honest prices, and free alterations from our in-house tailor.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/collections" className="btn-gold">
                Browse collection <IconArrowRight size={15} />
              </Link>
              <Link to="/offers" className="btn-ghost-light">
                Today’s offers
              </Link>
            </div>

            <div className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-parchment/15 pt-6">
              {[
                ['28 yrs', 'Serving Lucknow'],
                ['1,400+', 'Happy customers'],
                ['4.8 ★', 'Average rating'],
              ].map(([value, label]) => (
                <div key={label}>
                  <p className="font-display text-2xl text-gold">{value}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-parchment/45">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {offers?.active && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.25 }}
              className="absolute bottom-10 right-8 hidden w-72 rounded-2xl border border-gold/30 bg-navy/55 p-5 backdrop-blur-md lg:block"
            >
              <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Running now</p>
              <p className="mt-2 font-display text-2xl text-surface">{offers.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-parchment/60">{offers.subtitle}</p>
              <div className="mt-4 flex items-center justify-between border-t border-parchment/15 pt-3">
                <span className="rounded-full border border-dashed border-gold/70 px-3 py-1 font-mono text-[11px] tracking-widest text-gold">
                  {offers.code}
                </span>
                <Link to="/offers" className="text-[11px] font-medium text-parchment/70 underline decoration-gold/50 underline-offset-4 hover:text-gold">
                  Details
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Marquee strip */}
      <div className="overflow-hidden border-y border-gold/30 bg-gold py-2.5 text-navy">
        <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems].map((item, index) => (
            <span key={`${item}-${index}`} className="flex items-center gap-8 text-[11px] font-semibold uppercase tracking-[0.18em]">
              {item}
              <span className="h-1 w-1 rounded-full bg-navy/40" />
            </span>
          ))}
        </div>
      </div>

      {/* Categories */}
      <section className="container-x py-16 sm:py-20">
        <SectionHead
          eyebrow="Shop by collection"
          title="Find your occasion"
          description="From a Monday morning in the office to the last dance at a sangeet — every collection is hand-picked and stocked in store."
          action={
            <Link to="/collections" className="hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-navy/60 transition hover:text-gold-dark sm:flex">
              View all <IconArrowRight size={14} />
            </Link>
          }
        />
        <div className="flex snap-x gap-4 overflow-x-auto pb-3 hide-scrollbar">
          {loading
            ? Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-[340px] w-[220px] flex-none animate-pulse rounded-2xl bg-navy/5" />
              ))
            : categories.map((category) => (
                <Link
                  key={category.name}
                  to={`/collections?category=${encodeURIComponent(category.name)}`}
                  className="group relative h-[340px] w-[230px] flex-none snap-start overflow-hidden rounded-2xl bg-navy"
                >
                  <img
                    src={category.image || '/images/products/kurta-royal.svg'}
                    alt={category.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-surface">
                    <p className="font-display text-2xl leading-tight">{category.name}</p>
                    <p className="mt-0.5 text-[11px] text-parchment/55">
                      {category.blurb} · {category.count} {category.count === 1 ? 'piece' : 'pieces'}
                    </p>
                    <span className="mt-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gold/50 text-gold transition group-hover:bg-gold group-hover:text-navy">
                      <IconArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              ))}
        </div>
      </section>

      {/* New arrivals */}
      <section className="container-x pb-16 sm:pb-20">
        <SectionHead
          eyebrow="Fresh off the shelf"
          title="New arrivals"
          description="The latest pieces to reach the shop floor, updated every week."
          action={
            <Link to="/collections?sort=newest" className="hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-navy/60 transition hover:text-gold-dark sm:flex">
              Shop new <IconArrowRight size={14} />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, index) => (
                <div key={index}>
                  <div className="aspect-[4/5] animate-pulse rounded-2xl bg-navy/5" />
                  <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-navy/5" />
                  <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-navy/5" />
                </div>
              ))
            : arrivals.map((product, index) => <ProductCard key={product._id} product={product} index={index} />)}
        </div>
        <div className="mt-8 text-center sm:hidden">
          <Link to="/collections" className="btn-outline btn-sm">View all products</Link>
        </div>
      </section>

      {/* Festive offer banner */}
      {offers && (
        <section className="container-x pb-16 sm:pb-20">
          <motion.div
            {...fadeUp}
            className="relative overflow-hidden rounded-3xl bg-navy px-6 py-12 text-surface sm:px-12 sm:py-16"
          >
            <div
              className="absolute inset-0 opacity-25"
              style={{ backgroundImage: 'url(/images/puzzle.svg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-maroon-900/20" style={{ backgroundImage: 'linear-gradient(90deg, #0F1B3C 20%, rgba(15,27,60,0.9) 55%, rgba(90,29,38,0.55))' }} />
            <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div className="max-w-xl">
                <p className="eyebrow">{offers.festival || 'Festive season'}</p>
                <h2 className="mt-3 text-[36px] leading-[1.02] text-surface sm:text-[46px]">{offers.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-parchment/65">{offers.subtitle}</p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link to={`/collections?category=${encodeURIComponent('Festive Special')}`} className="btn-gold">
                    Shop the edit
                  </Link>
                  <span className="rounded-full border border-dashed border-gold/60 px-4 py-2 font-mono text-xs tracking-[0.2em] text-gold">
                    CODE: {offers.code}
                  </span>
                </div>
              </div>
              <div className="relative flex h-32 w-32 flex-none items-center justify-center rounded-full border border-gold/40 sm:h-40 sm:w-40">
                <div className="absolute inset-2 rounded-full border border-dashed border-gold/30" />
                <div className="text-center">
                  <p className="font-display text-4xl text-gold">20%</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.22em] text-parchment/60">flat off</p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* Games */}
      <section className="container-x pb-16 sm:pb-20">
        <SectionHead
          eyebrow="Play & win"
          title="Win up to 30% off"
          description="Two quick games, one-time coupon codes. Play on your phone while you browse — no purchase needed to play."
          align="center"
        />
        <div className="grid gap-5 md:grid-cols-2">
          <Link
            to="/spin-wheel"
            className="group relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-3xl bg-navy p-7 text-surface sm:p-9"
          >
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border-[18px] border-gold/20 transition duration-700 group-hover:rotate-45" />
            <div className="relative">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold text-navy">
                <IconGift size={21} />
              </span>
              <p className="mt-5 text-[10px] uppercase tracking-[0.24em] text-gold">Game 01</p>
              <h3 className="mt-1 font-display text-[30px] leading-tight text-surface">Spin the Wheel</h3>
              <p className="mt-2 max-w-xs text-sm text-parchment/60">
                Eight segments, one spin a week. Land on up to 30% off kurtas or a free alteration.
              </p>
            </div>
            <span className="relative mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Play now <IconArrowRight size={14} className="transition group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            to="/puzzle"
            className="group relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-3xl border border-navy/10 bg-surface p-7 sm:p-9"
          >
            <div className="absolute -bottom-10 -right-10 grid h-52 w-52 grid-cols-3 gap-1.5 opacity-25 transition duration-700 group-hover:scale-105">
              {Array.from({ length: 9 }).map((_, index) => (
                <span key={index} className="rounded bg-navy" style={{ opacity: 0.35 + index * 0.05 }} />
              ))}
            </div>
            <div className="relative">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy text-gold">
                <IconPuzzle size={21} />
              </span>
              <p className="mt-5 text-[10px] uppercase tracking-[0.24em] text-gold-dark">Game 02</p>
              <h3 className="mt-1 font-display text-[30px] leading-tight text-navy">Fabric Puzzle</h3>
              <p className="mt-2 max-w-xs text-sm text-ink/55">
                A nine-tile puzzle, two minutes on the clock. Solve it for a 12% off coupon.
              </p>
            </div>
            <span className="relative mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-navy">
              Accept the challenge <IconArrowRight size={14} className="transition group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </section>

      {/* Social */}
      <section className="bg-white py-16 sm:py-20">
        <div className="container-x">
          <SectionHead
            eyebrow={settings?.social?.handle || '@rajamenswear'}
            title="From our shop floor"
            description="Daily drops, fabric close-ups and customer fittings on Instagram."
            action={
              <a
                href={settings?.social?.instagram}
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-navy/60 transition hover:text-gold-dark sm:flex"
              >
                <IconInstagram size={15} /> Follow us
              </a>
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {posts.slice(0, 4).map((post, index) => (
              <a
                key={`${post.image}-${index}`}
                href={post.url || settings?.social?.instagram}
                target="_blank"
                rel="noreferrer"
                className="group relative aspect-square overflow-hidden rounded-xl bg-navy"
              >
                <img src={post.image} alt={post.caption || 'Shop post'} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-navy/85 via-navy/10 to-transparent p-4 opacity-0 transition duration-300 group-hover:opacity-100">
                  <IconInstagram size={18} className="text-gold" />
                  <p className="mt-2 text-[11px] leading-snug text-surface/80">{post.caption}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Chatbot promo */}
      <section className="container-x py-16 sm:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-navy p-8 text-surface sm:p-12">
          <div className="absolute inset-y-0 right-0 w-1/2 opacity-30">
            <img src="/images/social/post-2.svg" alt="" className="h-full w-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/95 to-navy/40" />
          <div className="relative max-w-lg">
            <p className="eyebrow">Ask Raja</p>
            <h2 className="mt-3 text-[32px] leading-tight text-surface sm:text-[40px]">Have a question? Our shop assistant is awake.</h2>
            <p className="mt-3 text-sm leading-relaxed text-parchment/60">
              Ask about fit, fabric, store timings, alterations or the right outfit for an occasion. Type or speak —
              Raja replies in seconds, 24/7.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={openChat} className="btn-gold">
                <IconSparkles size={16} /> Open chat
              </button>
              <Link to="/chatbot" className="btn-ghost-light">Full screen</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container-x pb-20">
        <SectionHead eyebrow="Word of mouth" title="People who walked in as strangers" align="center" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.slice(0, 4).map((testimonial, index) => (
            <motion.figure
              key={testimonial.id || testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              className="flex h-full flex-col rounded-2xl border border-navy/10 bg-white p-6"
            >
              <div className="flex gap-0.5 text-gold">
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <IconStar key={starIndex} size={13} filled className={starIndex < testimonial.rating ? 'text-gold' : 'text-navy/15'} />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-[13px] leading-relaxed text-ink/70">“{testimonial.text}”</blockquote>
              <figcaption className="mt-5 border-t border-navy/10 pt-4">
                <p className="font-display text-lg leading-none text-navy">{testimonial.name}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-ink/40">{testimonial.city}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gold/50 bg-white/60 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-display text-xl text-navy">Visit us at {shop?.address}, {shop?.city}</p>
            <p className="mt-1 text-xs text-ink/50">Walk in any day · {shop?.hours?.[0]?.time || '10 AM – 9 PM'}</p>
          </div>
          <div className="flex gap-2">
            <a href={`https://wa.me/91${shop?.whatsapp || ''}`} target="_blank" rel="noreferrer" className="btn-navy btn-sm">
              <IconWhatsApp size={15} /> WhatsApp us
            </a>
            <a href={shop?.mapsLink} target="_blank" rel="noreferrer" className="btn-outline btn-sm">Directions</a>
          </div>
        </div>
      </section>
    </div>
  );
}
