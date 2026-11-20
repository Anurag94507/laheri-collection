import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { getProducts } from '../api/index.js';
import { useSettings } from '../context/SettingsContext.jsx';
import usePageMeta from '../hooks/usePageMeta.js';
import ClothingRack from '../components/ClothingRack.jsx';
import QuickView from '../components/QuickView.jsx';
import ProductCard from '../components/ProductCard.jsx';
import Reveal from '../components/Reveal.jsx';
import SectionHead from '../components/SectionHead.jsx';
import { toast } from '../store/toast.js';
import { whatsappHref } from '../components/SendCodeLinks.jsx';
import {
  IconArrowRight,
  IconCheck,
  IconClock,
  IconGift,
  IconPercent,
  IconPhone,
  IconPin,
  IconPuzzle,
  IconSparkles,
  IconStar,
  IconTag,
  IconTruck,
  IconWhatsApp,
} from '../components/Icons.jsx';

const EASE = [0.22, 1, 0.36, 1];

const ASSURANCES = [
  { icon: IconCheck, text: 'Free alterations in 3 days' },
  { icon: IconTruck, text: 'Delivery across Uttar Pradesh' },
  { icon: IconSparkles, text: 'A new rack every week' },
  { icon: IconTag, text: 'Cash · UPI · Cards' },
];

const CATEGORY_TILES = [
  {
    label: 'Kurta & ethnic',
    blurb: 'Everyday and pooja',
    category: 'Kurta',
    image: '/images/photos/cloth-2.jpg',
    alt: 'Indigo chambray shirt hanging from a hanger',
  },
  {
    label: 'Sherwani & suiting',
    blurb: 'Wedding and sangeet',
    category: 'Sherwani',
    image: '/images/photos/cloth-1.jpg',
    alt: 'Blue windowpane three-piece suit worn with a tie',
  },
  {
    label: 'Formal shirts',
    blurb: 'Office and boardroom',
    category: 'Formal Shirt',
    image: '/images/photos/cloth-5.jpg',
    alt: 'Three formal shirts laid out on a wooden table',
  },
  {
    label: 'Casual & western',
    blurb: 'Easy weekends',
    category: 'Casual Wear',
    image: '/images/photos/cloth-9.jpg',
    alt: 'Rust bomber jacket held up on a hanger',
  },
  {
    label: 'Festive',
    blurb: 'Diwali, Eid, Holi',
    category: 'Festive Special',
    image: '/images/photos/cloth-4.jpg',
    alt: 'Blue striped shirt worn with a patterned tie',
  },
];

const SHOP_FLOOR = [
  {
    image: '/images/photos/cloth-9.jpg',
    caption: 'The rust bomber, straight off the rail',
    alt: 'Hand holding a rust bomber jacket on a hanger against a pale wall',
    width: 900,
    height: 1100,
  },
  {
    image: '/images/shop/tee-studio.jpg',
    caption: 'Cotton, in studio light',
    alt: 'Black cotton tee hanging in striped window light',
    width: 960,
    height: 1280,
  },
  {
    image: '/images/photos/cloth-2.jpg',
    caption: 'Indigo chambray, hung and ready',
    alt: 'Indigo chambray shirt hanging on a metal hook',
    width: 900,
    height: 1100,
  },
  {
    image: '/images/photos/cloth-5.jpg',
    caption: 'Three shirts, three fabrics, one fitting',
    alt: 'Navy, ivory and burgundy formal shirts on a wooden table',
    width: 900,
    height: 1100,
  },
];

const WHY_US = [
  { title: 'Fabric first', text: 'Cotton, linen and wool blends felt by hand before they ever reach the rail.' },
  { title: 'Fitted in the shop', text: 'Free alterations within three days, measured by the people who cut the cloth.' },
  { title: 'Honest shelf prices', text: 'The price on the tag is the price you pay — no invented MRP, no fake discounts.' },
  { title: 'One shop, every occasion', text: 'Ethnic, formal, casual and festive, for the wedding and the ordinary Tuesday.' },
];

export default function Home() {
  const { settings } = useSettings();
  const reduce = useReducedMotion();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  usePageMeta({
    title: 'Laheri Collection | Ethnic & Fashion Wear — Dressed for Every Occasion',
    description:
      'Shop the latest ethnic, western, casual and festive wear at Laheri Collection. Affordable fashion for every occasion. Explore new arrivals now.',
    path: '/',
    image: '/images/photos/cloth-3.jpg',
  });

  useEffect(() => {
    let alive = true;
    getProducts({ limit: 60, sort: 'newest' })
      .then((data) => {
        if (!alive) return;
        setProducts(data.items || []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const shop = settings?.shop;
  const offers = settings?.offers;
  const games = settings?.games || {};
  const testimonials = settings?.testimonials || [];

  const newArrivals = useMemo(() => {
    const fresh = products.filter((product) => product.isNewArrival);
    return (fresh.length ? fresh : products).slice(0, 8);
  }, [products]);

  const featured = useMemo(() => {
    const starred = products.filter((product) => product.isFeatured);
    return (starred.length ? starred : products).slice(0, 4);
  }, [products]);

  const gameCards = [
    games.spinEnabled !== false && {
      to: '/spin-wheel',
      icon: IconGift,
      label: 'Spin the wheel',
      text: 'A discount for the next time you walk in.',
    },
    games.puzzleEnabled !== false && {
      to: '/puzzle',
      icon: IconPuzzle,
      label: 'Solve the puzzle',
      text: 'A small reward for a sharp eye.',
    },
  ].filter(Boolean);

  const subscribe = (event) => {
    event.preventDefault();
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    const message = `Hello Laheri Collection! Please add ${address} to your offers list. I would like exclusive festive offers.`;
    window.open(whatsappHref(shop?.whatsapp, message), '_blank', 'noreferrer');
    setSubscribed(true);
    setEmail('');
    toast.success('Opening WhatsApp to confirm your subscription.');
  };

  const headline = ['A rack built', 'for every', 'occasion'];

  return (
    <div>
      {/* ---------------------------------------------------------------- */}
      {/* Editorial split hero                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b border-ink/10">
        <div className="container-x grid items-center gap-9 py-9 sm:py-12 lg:grid-cols-[1.04fr_0.96fr] lg:gap-14 lg:py-16 xl:py-20">
          <div>
            <p className="eyebrow-line">
              Laheri Collection · {shop?.city || 'Sultanpur'}
            </p>

            <h1 className="mt-5 font-display text-[40px] leading-[0.99] tracking-[-0.01em] text-ink sm:text-[54px] lg:text-[62px] xl:text-[68px]">
              {headline.map((line, index) => (
                <span key={line} className="block overflow-hidden pb-[0.06em]">
                  <motion.span
                    className="block"
                    initial={reduce ? false : { y: '108%' }}
                    animate={{ y: '0%' }}
                    transition={{ duration: 0.62, delay: 0.06 + index * 0.07, ease: EASE }}
                  >
                    {index === 2 ? <em className="font-normal italic">{line}</em> : line}
                  </motion.span>
                </span>
              ))}
            </h1>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-ink/60 sm:text-[15px]">
              Menswear cut for the wedding, the office, the pooja and the ordinary Tuesday. Try it on at
              Dariyapur Chauraha, or have it delivered across Uttar Pradesh.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="#new-arrivals" className="btn-navy">
                Walk the rail <IconArrowRight size={15} />
              </a>
              <Link to="/collections" className="btn-outline">
                View all collections
              </Link>
            </div>

            <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.18em] text-ink/45">
              <li className="flex items-center gap-2">
                <IconCheck size={13} className="text-gold-dark" /> Free alterations
              </li>
              <li className="flex items-center gap-2">
                <IconClock size={13} className="text-gold-dark" /> In-store fitting
              </li>
              <li className="flex items-center gap-2">
                <IconTruck size={13} className="text-gold-dark" /> 2–4 day delivery
              </li>
            </ul>
          </div>

          <motion.figure
            initial={reduce ? false : { clipPath: 'inset(0 0 0 100%)' }}
            animate={{ clipPath: 'inset(0 0 0 0%)' }}
            transition={{ duration: 0.95, delay: 0.16, ease: EASE }}
            className="relative"
          >
            <div className="relative overflow-hidden bg-[#e9e2d6]">
              <img
                src="/images/photos/cloth-3.jpg"
                alt="Man in a navy tailored two-piece suit and white shirt, photographed on location"
                width="900"
                height="1100"
                fetchPriority="high"
                decoding="async"
                className="h-[380px] w-full object-cover object-[50%_16%] sm:h-[500px] lg:h-[560px] xl:h-[600px] lg:object-[50%_20%]"
              />
              <span
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent"
                aria-hidden="true"
              />
              <span className="absolute bottom-4 left-4 bg-cream/95 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink">
Campaign 01 — Occasion dressing
              </span>
            </div>
            <figcaption className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-ink/40">
              <span>The navy suit, styled for a wedding</span>
              <span className="text-gold-dark">Sultanpur</span>
            </figcaption>
          </motion.figure>
        </div>
      </section>

      {/* Assurance strip */}
      <div className="border-b border-ink/10 bg-paper">
        <ul className="container-x grid grid-cols-2 gap-x-6 gap-y-3 py-4 text-[10px] uppercase tracking-[0.18em] text-ink/55 sm:grid-cols-4">
          {ASSURANCES.map((item) => (
            <li key={item.text} className="flex items-center gap-2">
              <item.icon size={14} className="flex-none text-gold-dark" />
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* The rail                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section id="new-arrivals" className="scroll-mt-24 py-14 sm:py-20">
        <div className="container-x">
          <SectionHead
            eyebrow="Just arrived"
            title="This week on the rail"
            description="Slide along the rack the way you would in the shop. The piece in the middle steps forward; tap any garment for fabric, sizes and a quick add."
            action={
              <Link
                to="/collections?sort=newest"
                className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/55 transition hover:text-ink sm:flex"
              >
                All new arrivals <IconArrowRight size={13} />
              </Link>
            }
          />
        </div>

        {loading ? (
          <div className="container-x flex gap-4 overflow-hidden pb-10">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="aspect-[3/4] w-[240px] flex-none animate-pulse bg-ink/5" />
            ))}
          </div>
        ) : (
          <ClothingRack products={newArrivals} onSelect={setSelected} ariaLabel="New arrivals rail" />
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Categories                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-y border-ink/10 bg-paper py-14 sm:py-20">
        <div className="container-x">
          <SectionHead
            eyebrow="Shop by occasion"
            title="Five rails, one shop"
            description="Start with the occasion — the floor is already sorted for it. Dhoti and traditional drape sit inside the full collection."
          />
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 lg:grid-cols-3">
            {CATEGORY_TILES.map((tile, index) => (
              <Reveal key={tile.label} delay={index * 0.05}>
                <Link
                  to={`/collections?category=${encodeURIComponent(tile.category)}`}
                  className="group block h-full"
                >
                  <div className="overflow-hidden bg-[#e9e2d6]">
                    <img
                      src={tile.image}
                      alt={`${tile.alt} — ${tile.label} at Laheri Collection`}
                      width="900"
                      height="1100"
                      loading="lazy"
                      decoding="async"
                      className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                    />
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-3 border-t border-ink/15 pt-3">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-ink/35">
                        0{index + 1}
                      </p>
                      <h3 className="mt-1 font-display text-[19px] leading-tight text-ink sm:text-[22px]">
                        {tile.label}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-ink/50">{tile.blurb}</p>
                    </div>
                    <span className="mt-1 flex h-8 w-8 flex-none items-center justify-center border border-ink/15 text-ink/50 transition group-hover:border-ink group-hover:bg-ink group-hover:text-cream">
                      <IconArrowRight size={13} />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}

            <Reveal delay={0.25} className="col-span-2 lg:col-span-1">
              <Link
                to="/collections"
                className="group flex h-full min-h-[220px] flex-col justify-between bg-navy p-6 text-cream sm:p-8"
              >
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-gold-light">
                    The whole floor
                  </p>
                  <h3 className="mt-3 font-display text-[26px] leading-[1.05] text-cream sm:text-[30px]">
                    Every piece,
                    <br />
                    one collection
                  </h3>
                </div>
                <ul className="my-6 space-y-1.5 border-y border-cream/10 py-5 text-[11px] uppercase tracking-[0.16em] text-cream/45">
                  {['Kurta & ethnic', 'Sherwani & suiting', 'Formal shirts', 'Casual & western', 'Festive', 'Dhoti & traditional'].map((line) => (
                    <li key={line} className="flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-gold/70" aria-hidden="true" />
                      {line}
                    </li>
                  ))}
                </ul>
                <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cream transition group-hover:text-gold-light">
                  Walk the rail <IconArrowRight size={13} />
                </span>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Featured edit                                                    */}
      {/* ---------------------------------------------------------------- */}
      <section className="container-x py-14 sm:py-20">
        <SectionHead
          eyebrow="The featured edit"
          title="Pieces we keep coming back to"
          description="Four hero pieces from the shop floor — fabric, fit and finish chosen for the season."
          action={
            <Link
              to="/collections"
              className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/55 transition hover:text-ink sm:flex"
            >
              Shop all <IconArrowRight size={13} />
            </Link>
          }
        />
        {loading ? (
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="aspect-[3/4] animate-pulse bg-ink/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {featured.map((product, index) => (
              <ProductCard
                key={product._id}
                product={product}
                index={index}
                onQuickView={setSelected}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* From the shop floor                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-y border-ink/10 bg-paper py-14 sm:py-20">
        <div className="container-x">
          <SectionHead
            eyebrow="From the shop floor"
            title="Fabric, fittings, real pieces"
            description="Photographed on the rail at Dariyapur Chauraha — as they hang, not styled into something they are not."
            action={
              <Link
                to="/about"
                className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/55 transition hover:text-ink sm:flex"
              >
                Our story <IconArrowRight size={13} />
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:items-start">
            {SHOP_FLOOR.map((shot, index) => (
              <Reveal
                key={shot.caption}
                delay={index * 0.06}
                className={index % 2 === 1 ? 'lg:mt-12' : ''}
              >
                <figure>
                  <img
                    src={shot.image}
                    alt={shot.alt}
                    width={shot.width}
                    height={shot.height}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/5] w-full object-cover"
                  />
                  <figcaption className="mt-2.5 text-[10px] uppercase tracking-[0.16em] text-ink/45">
                    {shot.caption}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Offer + Play & Win                                               */}
      {/* ---------------------------------------------------------------- */}
      <section className="container-x py-14 sm:py-16">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          {offers && (
            <div className="relative flex flex-col justify-center gap-6 overflow-hidden bg-navy p-6 text-cream sm:p-9">
              <div className="relative">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-light">
                  {offers.festival || 'This season'}
                </p>
                <h2 className="mt-3 max-w-md font-display text-[28px] leading-[1.05] text-cream sm:text-[34px]">
                  {offers.title}
                </h2>
                <p className="mt-2 max-w-md text-[13px] leading-relaxed text-cream/65">{offers.subtitle}</p>
              </div>
              <div className="relative flex flex-wrap items-center gap-3">
                <Link to="/offers" className="btn bg-cream text-navy hover:bg-gold-light">
                  See the offer
                </Link>
                <span className="border border-dashed border-cream/35 px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-gold-light">
                  {offers.code}
                </span>
              </div>
            </div>
          )}

          {gameCards.length > 0 && (
            <div className="border border-ink/15 bg-paper p-6 sm:p-8">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="eyebrow-line">Play &amp; win</p>
                  <h2 className="mt-2 font-display text-[24px] leading-tight text-ink sm:text-[28px]">
                    A little reward
                  </h2>
                </div>
                <IconPercent size={18} className="flex-none text-gold-dark" />
              </div>
              <div className="mt-5 space-y-2.5">
                {gameCards.map((game) => (
                  <Link
                    key={game.to}
                    to={game.to}
                    className="group flex items-center gap-3 border border-ink/15 px-4 py-3 transition hover:border-ink/35 hover:bg-surface"
                  >
                    <span className="flex h-9 w-9 flex-none items-center justify-center bg-surface text-ink/70 transition group-hover:bg-navy group-hover:text-cream">
                      <game.icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-ink">{game.label}</span>
                      <span className="block text-[11px] text-ink/50">{game.text}</span>
                    </span>
                    <IconArrowRight size={14} className="flex-none text-ink/35 transition group-hover:text-ink" />
                  </Link>
                ))}
              </div>
              <p className="mt-4 text-[10px] leading-relaxed text-ink/35">
                Prizes are redeemed in store or applied at checkout. One play per visit.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Why us                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-y border-ink/10 bg-paper py-14 sm:py-20">
        <div className="container-x">
          <div className="max-w-xl">
            <p className="eyebrow-line">The Laheri way</p>
            <h2 className="mt-3 display-lg">Four things we do not compromise on</h2>
          </div>
          <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_US.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.05} className="border-t border-ink/20 pt-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.26em] text-gold-dark">
                  0{index + 1}
                </p>
                <h3 className="mt-2 font-display text-[20px] leading-tight text-ink">{item.title}</h3>
                <p className="mt-2 text-[12px] leading-relaxed text-ink/55">{item.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Testimonials                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="container-x py-14 sm:py-20">
        <SectionHead
          eyebrow="Word of mouth"
          title="Loved by our customers"
          description="Notes from people who walked in as strangers and came back as regulars."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.slice(0, 3).map((testimonial, index) => (
            <Reveal
              key={testimonial.id || testimonial.name}
              delay={index * 0.05}
              className="flex h-full flex-col border-t border-ink/20 pt-5"
            >
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <IconStar
                    key={starIndex}
                    size={11}
                    filled
                    className={starIndex < testimonial.rating ? 'text-gold' : 'text-ink/15'}
                  />
                ))}
              </div>
              <blockquote className="mt-3 flex-1 font-display text-[17px] italic leading-relaxed text-ink/75">
                “{testimonial.text}”
              </blockquote>
              <figcaption className="mt-4 text-[10px] uppercase tracking-[0.18em] text-ink/45">
                <span className="text-ink/70">{testimonial.name}</span> · {testimonial.city}
              </figcaption>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Ask Laheri + Visit                                               */}
      {/* ---------------------------------------------------------------- */}
      <section className="container-x pb-14 sm:pb-20">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-navy p-7 text-cream sm:p-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-light">
              Ask Laheri
            </p>
            <h2 className="mt-3 max-w-sm font-display text-[28px] leading-[1.05] text-cream sm:text-[32px]">
              Not sure how it will fit?
            </h2>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-cream/65">
              Ask our shop assistant about fabric, sizing or alterations — in English or Hindi. Or message the
              shop directly and we will answer from the counter.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link to="/chatbot" className="btn bg-cream text-navy hover:bg-gold-light">
                Ask the assistant <IconArrowRight size={14} />
              </Link>
              {shop?.whatsapp && (
                <a
                  href={whatsappHref(shop.whatsapp, 'Hello Laheri Collection! I have a question about sizing.')}
                  target="_blank"
                  rel="noreferrer"
                  className="btn border-cream/35 text-cream hover:border-cream hover:bg-cream hover:text-navy"
                >
                  <IconWhatsApp size={15} /> WhatsApp
                </a>
              )}
            </div>
          </div>

          <div className="border border-ink/15 bg-paper p-7 sm:p-10">
            <p className="eyebrow-line">Visit the shop</p>
            <h2 className="mt-3 font-display text-[26px] leading-[1.1] text-ink sm:text-[30px]">
              {shop?.city || 'Sultanpur'}, Uttar Pradesh
            </h2>
            {shop && (
              <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-ink/60">
                {shop.address}
              </p>
            )}
            <dl className="mt-5 space-y-2.5 text-[12px] text-ink/60">
              {(shop?.hours || []).map((slot) => (
                <div key={slot.days} className="flex items-start gap-2.5">
                  <IconClock size={14} className="mt-0.5 flex-none text-gold-dark" />
                  <span>
                    <span className="text-ink/75">{slot.days}</span> · {slot.time}
                  </span>
                </div>
              ))}
              {shop?.phone && (
                <div className="flex items-start gap-2.5">
                  <IconPhone size={13} className="mt-0.5 flex-none text-gold-dark" />
                  <a href={`tel:${String(shop.phone).replace(/[^\d+]/g, '')}`} className="hover:text-ink">
                    {shop.phone}
                  </a>
                </div>
              )}
              <div className="flex items-start gap-2.5">
                <IconPin size={14} className="mt-0.5 flex-none text-gold-dark" />
                <span>Near Dariyapur Chauraha, Sultanpur</span>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link to="/contact" className="btn-navy btn-sm">
                Contact the shop
              </Link>
              {shop?.mapsLink && (
                <a
                  href={shop.mapsLink}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline btn-sm"
                >
                  Get directions
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Newsletter                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="container-x pb-16">
        <div className="grid items-center gap-7 border border-ink/15 bg-paper px-6 py-9 sm:px-10 md:grid-cols-2 md:gap-12">
          <div>
            <p className="eyebrow-line">The list</p>
            <h2 className="mt-3 font-display text-[28px] leading-[1.06] text-ink sm:text-[34px]">
              Get exclusive offers — subscribe now
            </h2>
            <p className="mt-2.5 max-w-sm text-[13px] leading-relaxed text-ink/55">
              Festive drops, new arrivals and alteration slots. No more than one message a week.
            </p>
          </div>
          <form onSubmit={subscribe} className="w-full">
            {subscribed ? (
              <div className="flex items-start gap-3 border border-ink/15 bg-surface p-4">
                <IconCheck size={18} className="mt-0.5 flex-none text-success" />
                <p className="text-sm text-ink/70">
                  Thank you — confirm the message in WhatsApp and we will add you to the offers list.
                </p>
              </div>
            ) : (
              <>
                <label htmlFor="newsletter-email" className="label">
                  Email address
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="newsletter-email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="input flex-1"
                    autoComplete="email"
                  />
                  <button type="submit" className="btn-navy flex-none">
                    Subscribe
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-ink/40">
                  We confirm subscriptions on WhatsApp so your inbox stays clean.
                </p>
              </>
            )}
          </form>
        </div>
      </section>

      <QuickView product={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
