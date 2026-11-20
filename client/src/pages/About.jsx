import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.jsx';
import usePageMeta from '../hooks/usePageMeta.js';
import { telHref, whatsappHref } from '../components/SendCodeLinks.jsx';
import { IconArrowRight, IconCheck, IconPhone, IconSparkles, IconWhatsApp } from '../components/Icons.jsx';

const VALUES = [
  { title: 'Fabric first', text: 'Cotton that breathes in June, wool that holds its shape in December. We feel every bolt before it reaches the rail.' },
  { title: 'Fitted, not guessed', text: 'Free alterations within three days, measured in the shop by the same hands that cut the cloth.' },
  { title: 'Fair shelf prices', text: 'No inflated MRP, no fake discounts. A clear price on every tag, and seasonal offers when they are real.' },
  { title: 'For the whole family', text: 'Ethnic, western, casual, formal and festive — one shop for the wedding, the office and the everyday.' },
];

export default function About() {
  const { settings } = useSettings();
  const shop = settings?.shop;
  const testimonials = settings?.testimonials || [];
  const rating = testimonials.length
    ? (testimonials.reduce((sum, item) => sum + Number(item.rating || 0), 0) / testimonials.length).toFixed(1)
    : null;

  usePageMeta({
    title: 'About Laheri Collection | Our Story & Craft — Sultanpur',
    description:
      'The story of Laheri Collection: a family clothing shop in Sultanpur dressing every occasion with quality fabric, honest prices and in-house alterations.',
    path: '/about',
    image: '/images/photos/cloth-5.jpg',
  });

  return (
    <div>
      {/* Intro */}
      <section className="relative overflow-hidden bg-navy-900 text-cream">
        <img
          src="/images/photos/cloth-5.jpg"
          alt="Formal shirts from the Laheri Collection rail on a wooden table"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
          fetchPriority="high"
        />
        <div className="absolute inset-0 hero-wash" aria-hidden="true" />
        <div className="container-x relative py-16 sm:py-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-gold">Our story</p>
          <div className="gold-rule mt-5 w-24" />
          <h1 className="mt-6 max-w-3xl font-display text-[42px] leading-[0.98] text-cream sm:text-[60px]">
            A family shop, dressing
            <span className="italic text-gold"> every occasion</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-cream/75">
            Laheri Collection began at Dariyapur Chauraha with a simple idea: good clothes should not need an occasion
            to be expensive, and no occasion should be let down by the clothes.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="container-x py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <p className="eyebrow">The shop</p>
            <h2 className="mt-3 font-display text-[32px] leading-[1.05] text-navy sm:text-[40px]">
              We believe fashion is for everyone, every occasion
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-ink/65">
              <p>
                What started as a single rail of kurtas has grown into a shop full of pieces for weddings, festivals,
                offices and ordinary Tuesdays. The racks are built the way we shop ourselves: by occasion, by fabric,
                by how a thing actually feels when you put it on.
              </p>
              <p>
                {shop?.owner || 'The family'} still opens the shop most mornings and still measures most alterations
                personally. Our tailors work in-house, so a hem taken up on Monday is ready by Thursday — and nothing
                leaves the shop unless it sits right.
              </p>
              <p>
                We keep the catalogue honest. The price on the screen is the price on the tag, the fabric notes are
                written by the people who felt the cloth, and if a piece is not right for you we will say so.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/collections" className="btn-navy">
                Explore the collection <IconArrowRight size={15} />
              </Link>
              <a
                href={whatsappHref(shop?.whatsapp, 'Hello Laheri Collection! I have a question about your shop.')}
                target="_blank"
                rel="noreferrer"
                className="btn-outline"
              >
                <IconWhatsApp size={15} /> Talk to us
              </a>
            </div>
          </div>

          <div className="relative">
            <img
              src="/images/photos/cloth-2.jpg"
              alt="Indigo cotton shirt hanging in the Laheri Collection shop"
              loading="lazy"
              className="aspect-[4/5] w-full object-cover shadow-hang"
            />
            <div className="absolute -bottom-6 -left-4 hidden max-w-[220px] bg-navy p-5 text-cream shadow-lift sm:block">
              <p className="font-display text-3xl text-gold-light">3 days</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.22em] text-cream/70">
                In-house alterations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-y border-navy/10 bg-paper py-12">
        <div className="container-x grid gap-8 text-center sm:grid-cols-3">
          <div>
            <p className="font-display text-[40px] leading-none text-ink">3 days</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-ink/50">In-house alterations</p>
          </div>
          <div>
            <p className="font-display text-[40px] leading-none text-ink">{rating ? `${rating}★` : '5★'}</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-ink/50">Average customer rating</p>
          </div>
          <div>
            <p className="font-display text-[40px] leading-none text-ink">{settings?.shipping?.deliveryDays || '2–4 days'}</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-ink/50">Delivery across Uttar Pradesh</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="container-x py-14 sm:py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">How we work</p>
          <h2 className="mt-3 font-display text-[32px] leading-[1.05] text-navy sm:text-[40px]">
            Four things we will not compromise on
          </h2>
        </div>
        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          {VALUES.map((value, index) => (
            <div key={value.title} className="flex gap-4 border-t border-navy/15 pt-5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gold/20 text-navy">
                {index === 0 ? <IconSparkles size={16} /> : <IconCheck size={16} />}
              </span>
              <div>
                <h3 className="font-display text-xl text-navy">{value.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{value.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Visit */}
      <section className="container-x pb-16">
        <div className="flex flex-col items-start justify-between gap-6 border border-gold/40 bg-cream px-6 py-8 sm:flex-row sm:items-center sm:px-10">
          <div>
            <p className="eyebrow">Come see for yourself</p>
            <h2 className="mt-2 font-display text-2xl text-navy sm:text-3xl">
              {shop?.address || 'Near Dariyapur Chauraha, Sultanpur'}
            </h2>
            <p className="mt-1 text-sm text-ink/55">
              {shop?.hours?.[0]?.days || 'Monday – Saturday'} · {shop?.hours?.[0]?.time || '10 AM – 9 PM'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={telHref(shop?.phone)} className="btn-navy btn-sm">
              <IconPhone size={14} /> Call the shop
            </a>
            <Link to="/contact" className="btn-outline btn-sm">
              Contact &amp; directions
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
