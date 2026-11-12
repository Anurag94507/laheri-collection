import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.jsx';
import {
  IconFacebook,
  IconInstagram,
  IconMail,
  IconMap,
  IconPhone,
  IconPin,
  IconWhatsApp,
  IconYoutube,
} from './Icons.jsx';

export default function Footer() {
  const { settings } = useSettings();
  const shop = settings?.shop;
  const social = settings?.social;
  if (!shop) {
    return <footer className="bg-navy py-16 text-center text-sm text-parchment/50">Loading shop details…</footer>;
  }

  const waLink = `https://wa.me/91${shop.whatsapp}?text=${encodeURIComponent('Hello, I would like to know more about your collection.')}`;

  return (
    <footer className="texture-indigo mt-24 text-surface">
      <div className="container-x grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/60 font-display text-2xl text-gold">R</span>
            <div>
              <p className="font-display text-2xl">{shop.name}</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-parchment/50">Est. {shop.established}</p>
            </div>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-parchment/60">{shop.tagline}</p>
          <div className="mt-6 flex gap-3">
            <a href={social?.instagram} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full border border-parchment/20 transition hover:border-gold hover:text-gold" aria-label="Instagram">
              <IconInstagram size={18} />
            </a>
            <a href={social?.facebook} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full border border-parchment/20 transition hover:border-gold hover:text-gold" aria-label="Facebook">
              <IconFacebook size={18} />
            </a>
            <a href={social?.youtube} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full border border-parchment/20 transition hover:border-gold hover:text-gold" aria-label="YouTube">
              <IconYoutube size={18} />
            </a>
            <a href={waLink} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-navy transition hover:bg-gold-light" aria-label="WhatsApp">
              <IconWhatsApp size={18} />
            </a>
          </div>
        </div>

        <div className="md:col-span-2">
          <p className="font-display text-lg text-gold">Shop</p>
          <ul className="mt-4 space-y-2.5 text-sm text-parchment/65">
            <li><Link to="/collections" className="transition hover:text-gold">All collections</Link></li>
            <li><Link to="/collections?category=Sherwani" className="transition hover:text-gold">Sherwanis</Link></li>
            <li><Link to="/collections?category=Kurta" className="transition hover:text-gold">Kurtas</Link></li>
            <li><Link to="/collections?category=Formal%20Shirt" className="transition hover:text-gold">Formal shirts</Link></li>
            <li><Link to="/offers" className="transition hover:text-gold">Festive offers</Link></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <p className="font-display text-lg text-gold">Help</p>
          <ul className="mt-4 space-y-2.5 text-sm text-parchment/65">
            <li><Link to="/track" className="transition hover:text-gold">Track an order</Link></li>
            <li><Link to="/spin-wheel" className="transition hover:text-gold">Spin the wheel</Link></li>
            <li><Link to="/puzzle" className="transition hover:text-gold">Puzzle challenge</Link></li>
            <li><Link to="/chatbot" className="transition hover:text-gold">Ask our assistant</Link></li>
            <li><Link to="/admin/login" className="transition hover:text-gold">Shopkeeper login</Link></li>
          </ul>
        </div>

        <div className="md:col-span-4">
          <p className="font-display text-lg text-gold">Visit the shop</p>
          <ul className="mt-4 space-y-3 text-sm text-parchment/65">
            <li className="flex gap-3">
              <IconPin size={17} className="mt-0.5 flex-none text-gold" />
              <span>{shop.address}, {shop.city}, {shop.state} {shop.pincode}</span>
            </li>
            <li className="flex gap-3">
              <IconPhone size={16} className="mt-0.5 flex-none text-gold" />
              <a href={`tel:+91${shop.phone}`} className="transition hover:text-gold">+91 {shop.phone}</a>
            </li>
            <li className="flex gap-3">
              <IconMail size={16} className="mt-0.5 flex-none text-gold" />
              <a href={`mailto:${shop.email}`} className="transition hover:text-gold">{shop.email}</a>
            </li>
            <li className="flex gap-3">
              <IconMap size={16} className="mt-0.5 flex-none text-gold" />
              <a href={shop.mapsLink} target="_blank" rel="noreferrer" className="transition hover:text-gold">Get directions on Google Maps</a>
            </li>
          </ul>
          <div className="mt-5 space-y-1 text-xs text-parchment/45">
            {(shop.hours || []).map((slot) => (
              <p key={slot.days}>{slot.days} · {slot.time}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-parchment/10">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-[11px] text-parchment/40 sm:flex-row">
          <p>© {new Date().getFullYear()} {shop.name}. All rights reserved. GSTIN {shop.gstin}</p>
          <p>Cash · UPI · Cards accepted in store · Secure checkout online</p>
        </div>
      </div>
    </footer>
  );
}
