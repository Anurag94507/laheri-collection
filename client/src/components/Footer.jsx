import { Link } from 'react-router-dom';
import { telHref, whatsappHref } from './SendCodeLinks.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { IconArrowRight, IconMail, IconPhone, IconPin, IconWhatsApp } from './Icons.jsx';

export default function Footer() {
  const { settings } = useSettings();
  const shop = settings?.shop;
  if (!shop) {
    return <footer className="bg-navy py-16 text-center text-sm text-cream/50">Loading shop details…</footer>;
  }

  const waLink = shop.whatsapp
    ? whatsappHref(shop.whatsapp, 'Hello, I would like to know more about your collection.')
    : null;

  return (
    <footer className="texture-indigo mt-20 text-surface">
      <div className="container-x grid gap-10 py-14 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-4">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="" width="44" height="44" loading="lazy" className="h-11 w-11 rounded-full ring-1 ring-cream/20" />
            <div>
              <p className="font-display text-[22px] text-cream">{shop.name}</p>
              <p className="text-[9px] uppercase tracking-[0.28em] text-gold-light/80">Dressed for every occasion</p>
            </div>
          </div>
          <p className="mt-5 max-w-xs text-[13px] leading-relaxed text-cream/55">
            Menswear for the wedding, the office and the everyday — chosen, fitted and altered at Dariyapur
            Chauraha, Sultanpur.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-cream/25 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream transition hover:border-cream hover:bg-cream hover:text-ink"
              >
                <IconWhatsApp size={15} /> WhatsApp the shop
              </a>
            )}
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-1 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/60 transition hover:text-cream"
            >
              Contact <IconArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="md:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cream/40">Shop</p>
          <ul className="mt-4 space-y-2.5 text-[13px] text-cream/60">
            <li><Link to="/collections" className="transition hover:text-cream">All collections</Link></li>
            <li><Link to="/collections?category=Kurta" className="transition hover:text-cream">Kurta &amp; ethnic</Link></li>
            <li><Link to="/collections?category=Sherwani" className="transition hover:text-cream">Sherwani &amp; suiting</Link></li>
            <li><Link to="/collections?category=Formal%20Shirt" className="transition hover:text-cream">Formal shirts</Link></li>
            <li><Link to="/collections?category=Casual%20Wear" className="transition hover:text-cream">Casual &amp; western</Link></li>
            <li><Link to="/offers" className="transition hover:text-cream">Offers</Link></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cream/40">Shop with us</p>
          <ul className="mt-4 space-y-2.5 text-[13px] text-cream/60">
            <li><Link to="/about" className="transition hover:text-cream">Our story</Link></li>
            <li><Link to="/contact" className="transition hover:text-cream">Visit &amp; contact</Link></li>
            <li><Link to="/track" className="transition hover:text-cream">Track an order</Link></li>
            <li><Link to="/spin-wheel" className="transition hover:text-cream">Play &amp; win</Link></li>
            <li><Link to="/chatbot" className="transition hover:text-cream">Ask Laheri</Link></li>
            <li><Link to="/admin/login" className="transition hover:text-cream">Shopkeeper login</Link></li>
          </ul>
        </div>

        <div className="md:col-span-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cream/40">Visit the shop</p>
          <ul className="mt-4 space-y-3 text-[13px] text-cream/60">
            <li className="flex gap-3">
              <IconPin size={16} className="mt-0.5 flex-none text-gold-light/80" />
              <span>{shop.address || [shop.city, shop.state, shop.pincode].filter(Boolean).join(', ')}</span>
            </li>
            {shop.phone && (
              <li className="flex gap-3">
                <IconPhone size={15} className="mt-0.5 flex-none text-gold-light/80" />
                <a href={telHref(shop.phone)} className="transition hover:text-cream">{shop.phone}</a>
              </li>
            )}
            {shop.email && (
              <li className="flex gap-3">
                <IconMail size={15} className="mt-0.5 flex-none text-gold-light/80" />
                <a href={`mailto:${shop.email}`} className="transition hover:text-cream">{shop.email}</a>
              </li>
            )}
          </ul>
          <div className="mt-5 space-y-1 text-[11px] text-cream/45">
            {(shop.hours || []).map((slot) => (
              <p key={slot.days}>{slot.days} · {slot.time}</p>
            ))}
          </div>
          {shop.mapsLink && (
            <a
              href={shop.mapsLink}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-light/80 transition hover:text-gold-light"
            >
              Get directions <IconArrowRight size={12} />
            </a>
          )}
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-[10px] uppercase tracking-[0.14em] text-cream/35 sm:flex-row">
          <p>© {new Date().getFullYear()} {shop.name}</p>
          <p className="sm:pr-44">Cash · UPI · Cards in store · Secure checkout online</p>
        </div>
      </div>
    </footer>
  );
}
