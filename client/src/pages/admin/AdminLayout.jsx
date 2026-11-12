import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { toast } from '../../store/toast.js';
import {
  IconClose,
  IconDashboard,
  IconGift,
  IconLogout,
  IconMenu,
  IconPackage,
  IconReceipt,
  IconSettings,
  IconTag,
  IconUsers,
  IconChat,
} from '../../components/Icons.jsx';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: IconDashboard },
  { to: '/admin/billing', label: 'Offline billing', icon: IconReceipt },
  { to: '/admin/products', label: 'Products', icon: IconPackage },
  { to: '/admin/orders', label: 'Online orders', icon: IconTag },
  { to: '/admin/customers', label: 'Customers · CRM', icon: IconUsers },
  { to: '/admin/bulk-send', label: 'Bulk messaging', icon: IconChat },
  { to: '/admin/games', label: 'Game coupons', icon: IconGift },
  { to: '/admin/settings', label: 'Shop settings', icon: IconSettings },
];

const pageTitles = {
  '/admin/dashboard': { title: 'Dashboard', subtitle: 'Today at the shop' },
  '/admin/billing': { title: 'Offline billing', subtitle: 'Create a bill for a walk-in customer' },
  '/admin/products': { title: 'Products', subtitle: 'Catalogue, pricing and stock' },
  '/admin/orders': { title: 'Online orders', subtitle: 'Pack, dispatch and update customers' },
  '/admin/customers': { title: 'Customers', subtitle: 'Every contact, one CRM' },
  '/admin/bulk-send': { title: 'Bulk messaging', subtitle: 'WhatsApp, SMS and email campaigns' },
  '/admin/games': { title: 'Game coupons', subtitle: 'Codes won on the website' },
  '/admin/settings': { title: 'Shop settings', subtitle: 'Shop details, offers and chatbot' },
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const meta = pageTitles[location.pathname] || { title: 'Admin', subtitle: '' };

  const signOut = async () => {
    await logout();
    toast.info('Signed out.');
    navigate('/admin/login', { replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/admin/dashboard" className="flex items-center gap-3 px-5 py-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/50 font-display text-xl text-gold">R</span>
        <div>
          <p className="font-display text-xl leading-none text-surface">{settings?.shop?.name || 'Raja Menswear'}</p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.24em] text-parchment/40">Shopkeeper console</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition ${
                isActive ? 'bg-gold text-navy' : 'text-parchment/60 hover:bg-white/5 hover:text-surface'
              }`
            }
          >
            <item.icon size={17} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-parchment/10 p-4">
        <div className="mb-3 flex items-center gap-3 px-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase text-gold">
            {(user?.username || 'A').slice(0, 2)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-surface">{user?.username || 'admin'}</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-parchment/35">Shopkeeper</p>
          </div>
        </div>
        <Link to="/" className="mb-2 block rounded-lg border border-parchment/15 px-3 py-2 text-center text-[11px] text-parchment/60 transition hover:border-gold hover:text-gold">
          View storefront
        </Link>
        <button type="button" onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] text-parchment/50 transition hover:bg-error/15 hover:text-error">
          <IconLogout size={14} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F1EA]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] bg-navy lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-navy/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[264px] bg-navy">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 text-parchment/50" aria-label="Close menu">
              <IconClose size={20} />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 border-b border-navy/10 bg-[#F4F1EA]/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-navy/15 text-navy lg:hidden" aria-label="Open menu">
                <IconMenu size={18} />
              </button>
              <div>
                <h1 className="font-display text-[26px] leading-none">{meta.title}</h1>
                <p className="mt-1 text-[11px] text-ink/40">{meta.subtitle}</p>
              </div>
            </div>
            <div className="hidden items-center gap-4 sm:flex">
              <p className="text-[11px] text-ink/40">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <Link to="/admin/billing" className="btn-navy btn-sm">+ New bill</Link>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
