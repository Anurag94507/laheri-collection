import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cartCount, useCart } from '../store/cart.js';
import { useBagFx } from '../store/bagFx.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { IconArrowRight, IconBag, IconClose, IconLock, IconMenu, IconSearch, IconUser, IconWhatsApp } from './Icons.jsx';
import { whatsappHref } from './SendCodeLinks.jsx';
import InstallApp from './InstallApp.jsx';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/collections', label: 'Shop' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/offers', label: 'Offers' },
];

const drawerLinks = [...links, { to: '/track', label: 'Track order' }, { to: '/chatbot', label: 'Ask Laheri' }];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [popping, setPopping] = useState(false);
  const searchRef = useRef(null);
  const { items } = useCart();
  const pulse = useBagFx((state) => state.pulse);
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const count = cartCount(items);
  const shop = settings?.shop;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!pulse) return undefined;
    setPopping(true);
    const timer = window.setTimeout(() => setPopping(false), 680);
    return () => window.clearTimeout(timer);
  }, [pulse]);

  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    searchRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  const submitSearch = (event) => {
    event.preventDefault();
    const term = query.trim();
    setSearchOpen(false);
    setQuery('');
    navigate(term ? `/collections?q=${encodeURIComponent(term)}` : '/collections');
  };

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-navy text-cream">
        <div className="container-x flex h-9 items-center justify-between gap-4 overflow-hidden text-[9px] uppercase tracking-[0.2em] sm:text-[10px]">
          <Link to="/collections?category=Festive%20Special" className="group flex min-w-0 items-center gap-2">
            <span className="text-gold-light">New</span>
            <span className="truncate text-cream/85">Festive collection on the rail — shop now</span>
            <IconArrowRight size={12} className="hidden flex-none text-gold-light transition group-hover:translate-x-1 sm:block" />
          </Link>
          <p className="hidden flex-none text-cream/50 lg:block">Free delivery above ₹1,999 · Alterations in 3 days</p>
        </div>
      </div>

      <header
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? 'border-ink/15 bg-surface/95 shadow-[0_16px_34px_-32px_rgba(25,22,18,0.55)] backdrop-blur-md'
            : 'border-ink/10 bg-surface'
        }`}
      >
        <div className="container-x flex h-[64px] items-center justify-between gap-3 sm:h-[74px]">
          <Link to="/" className="group flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <img
              src="/logo.svg"
              alt={`${shop?.name || 'Laheri Collection'} logo`}
              width="40"
              height="40"
              className="h-9 w-9 flex-none rounded-full ring-1 ring-ink/15 transition group-hover:ring-gold sm:h-10 sm:w-10"
            />
            <span className="min-w-0 leading-none">
              <span className="block truncate font-display text-[17px] tracking-[0.01em] text-ink sm:text-[23px]">
                {shop?.name || 'Laheri Collection'}
              </span>
              <span className="mt-1.5 hidden text-[8px] uppercase tracking-[0.3em] text-ink/40 sm:block">
                Dressed for every occasion
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `link-underline text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                    isActive ? 'text-ink after:w-full' : 'text-ink/55 hover:text-ink'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex flex-none items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center text-ink/65 transition hover:text-ink sm:h-10 sm:w-10"
              aria-label="Search the collection"
            >
              <IconSearch size={18} />
            </button>
            <Link
              to="/account"
              className="hidden h-10 w-10 items-center justify-center text-ink/65 transition hover:text-ink sm:flex"
              aria-label="My account"
            >
              <IconUser size={17} />
            </Link>
            <Link
              to="/admin/login"
              className="hidden h-10 w-10 items-center justify-center text-ink/55 transition hover:text-ink xl:flex"
              aria-label="Shopkeeper login"
            >
              <IconLock size={16} />
            </Link>
            <InstallApp className="hidden h-10 w-10 text-ink/55 hover:text-ink xl:inline-flex" />
            <Link
              to="/cart"
              data-bag-drop
              className={`relative ml-1 hidden h-10 items-center gap-2 border border-ink/20 px-3.5 text-ink transition hover:border-ink hover:bg-ink hover:text-cream sm:flex ${
                popping ? 'animate-bag-pop' : ''
              }`}
              aria-label={`Open bag, ${count} ${count === 1 ? 'item' : 'items'}`}
            >
              <IconBag size={17} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">Bag</span>
              {count > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center bg-gold px-1 text-[9px] font-bold text-navy">
                  {count}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="flex h-9 w-9 items-center justify-center text-ink lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              {open ? <IconClose size={21} /> : <IconMenu size={21} />}
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
              className="overflow-hidden border-t border-ink/10 bg-surface lg:hidden"
            >
              <div className="container-x flex flex-col py-2">
                {drawerLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `border-b border-ink/5 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] ${
                        isActive ? 'text-gold-dark' : 'text-ink/65'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
                <div className="flex gap-2 py-4">
                  <Link to="/collections" className="btn-navy btn-sm flex-1">
                    Walk the rail
                  </Link>
                  {shop?.whatsapp && (
                    <a
                      href={whatsappHref(shop.whatsapp, 'Hello Laheri Collection! I have a question.')}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-outline btn-sm flex-1"
                    >
                      <IconWhatsApp size={14} /> WhatsApp
                    </a>
                  )}
                </div>
                <InstallApp label className="w-full justify-start border-b border-ink/5 py-3 text-sm font-medium text-gold-dark" />
                <div className="flex items-center justify-between py-3.5 text-xs text-ink/45">
                  <Link to="/account" className="font-medium text-ink">
                    My account
                  </Link>
                  <Link to="/admin/login">Shopkeeper login →</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-ink/45 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          >
            <motion.form
              onSubmit={submitSearch}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(event) => event.stopPropagation()}
              className="mx-auto mt-20 w-[min(92vw,660px)] border border-ink/10 bg-paper p-6 shadow-lift sm:mt-24 sm:p-8"
              role="search"
            >
              <div className="flex items-center justify-between">
                <p className="eyebrow">Search Laheri Collection</p>
                <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className="text-ink/50 hover:text-ink">
                  <IconClose size={18} />
                </button>
              </div>
              <label className="mt-5 flex items-center gap-3 border-b border-ink/25 pb-3">
                <IconSearch size={20} className="text-gold-dark" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Kurta, sherwani, formal shirt…"
                  aria-label="Search products"
                  className="min-w-0 flex-1 bg-transparent font-display text-xl text-ink outline-none placeholder:text-ink/30"
                />
              </label>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {['Kurta', 'Sherwani', 'Formal Shirt', 'Festive Special'].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      navigate(`/collections?category=${encodeURIComponent(term)}`);
                    }}
                    className="chip"
                  >
                    {term}
                  </button>
                ))}
                <button type="submit" className="btn-navy btn-sm ml-auto">
                  Search
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
