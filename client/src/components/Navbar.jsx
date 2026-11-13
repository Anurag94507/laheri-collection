import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cartCount, useCart } from '../store/cart.js';
import { useChat } from '../store/chat.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { IconBag, IconChat, IconClose, IconLock, IconMenu, IconUser } from './Icons.jsx';
import InstallApp from './InstallApp.jsx';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/collections', label: 'Collections' },
  { to: '/offers', label: 'Offers' },
  { to: '/spin-wheel', label: 'Play & Win' },
  { to: '/track', label: 'Track Order' },
  { to: '/chatbot', label: 'Ask Laheri' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { items } = useCart();
  const { openChat, open: chatOpen } = useChat();
  const { settings } = useSettings();
  const location = useLocation();
  const count = cartCount(items);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <>
      <div className="bg-navy text-parchment/80">
        <div className="container-x flex h-9 items-center justify-between gap-4 overflow-hidden text-[10px] uppercase tracking-[0.18em] sm:text-[11px]">
          <p className="truncate">Free delivery above ₹1,999 · Free alterations within 3 days</p>
          <p className="hidden flex-none items-center gap-2 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            Open till 9 PM · {settings?.shop?.city || 'Lucknow'}
          </p>
        </div>
      </div>

      <header
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          scrolled ? 'border-navy/10 bg-surface/95 shadow-[0_10px_30px_-24px_rgba(15,27,60,0.6)] backdrop-blur' : 'border-transparent bg-surface'
        }`}
      >
        <div className="container-x flex h-[72px] items-center justify-between gap-4">
          <Link to="/" className="group flex items-center gap-3">
            <img
              src="/logo.svg"
              alt={`${settings?.shop?.name || 'Laheri Collection'} logo`}
              className="h-11 w-11 rounded-full ring-1 ring-gold/40 transition group-hover:ring-gold"
            />
            <span className="leading-none">
              <span className="block font-display text-[22px] font-semibold tracking-wide text-navy">
                {settings?.shop?.name || 'Laheri Collection'}
              </span>
              <span className="mt-1 block text-[9px] uppercase tracking-[0.32em] text-ink/45">
                Est. {settings?.shop?.established || 1998} · {settings?.shop?.city || 'Lucknow'}
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `link-underline text-[13px] font-medium tracking-wide transition ${
                    isActive ? 'text-navy after:w-full' : 'text-ink/60 hover:text-navy'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={openChat}
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-navy/10 text-navy/70 transition hover:border-gold hover:text-navy sm:flex"
              aria-label="Open shop assistant"
            >
              <IconChat size={18} />
            </button>
            <Link
              to="/account"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-navy/10 text-navy/70 transition hover:border-gold hover:text-navy"
              aria-label="My account"
            >
              <IconUser size={17} />
            </Link>
            <Link
              to="/admin/login"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-navy/10 text-navy/70 transition hover:border-gold hover:text-navy sm:flex"
              aria-label="Shopkeeper login"
            >
              <IconLock size={17} />
            </Link>
            <InstallApp className="hidden h-10 w-10 rounded-full border border-navy/10 text-navy/70 hover:border-gold hover:text-navy sm:inline-flex" />
            <Link
              to="/cart"
              className="relative flex h-10 items-center gap-2 rounded-full bg-navy px-3.5 text-surface transition hover:bg-navy-800 sm:px-4"
              aria-label="Open cart"
            >
              <IconBag size={18} />
              <span className="hidden text-xs font-medium tracking-wide sm:block">Bag</span>
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-navy">
                  {count}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-navy/10 text-navy lg:hidden"
              aria-label="Toggle menu"
            >
              {open ? <IconClose size={20} /> : <IconMenu size={20} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-navy/10 bg-surface lg:hidden"
            >
              <div className="container-x flex flex-col py-3">
                {links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `border-b border-navy/5 py-3 text-sm font-medium ${isActive ? 'text-gold-dark' : 'text-ink/70'}`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
                <div className="flex gap-3 py-4">
                  <Link to="/cart" className="btn-navy btn-sm flex-1">
                    View bag
                  </Link>
                  <button type="button" onClick={openChat} className="btn-outline btn-sm flex-1">
                    Ask Laheri
                  </button>
                </div>
                <InstallApp label className="w-full justify-start border-b border-navy/5 py-3 text-sm font-medium text-gold-dark" />
                <div className="flex items-center justify-between border-t border-navy/5 py-4 text-xs text-ink/50">
                  <Link to="/account" className="font-medium text-navy">
                    My account · bag & orders
                  </Link>
                  <Link to="/admin/login">
                    Shopkeeper login →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {chatOpen && <span className="sr-only">Assistant open</span>}
    </>
  );
}
