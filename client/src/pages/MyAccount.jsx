import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyOrders, setCustomerPassword, updateCustomerProfile } from '../api/index.js';
import { useCustomer, loadBagIntoCart } from '../store/customer.js';
import { useCart } from '../store/cart.js';
import { toast } from '../store/toast.js';
import { formatINR } from '../utils/format.js';
import { IconBag, IconCheck, IconLogout, IconPackage, IconUser } from '../components/Icons.jsx';

const TABS = [
  { id: 'bag', label: 'My bag', icon: IconBag },
  { id: 'orders', label: 'My orders', icon: IconPackage },
  { id: 'profile', label: 'Profile', icon: IconUser },
];

const STATUS_TONE = {
  placed: 'bg-navy/5 text-navy',
  confirmed: 'bg-gold/15 text-gold-dark',
  packed: 'bg-gold/15 text-gold-dark',
  shipped: 'bg-blue-500/10 text-blue-700',
  delivered: 'bg-green-600/10 text-green-700',
  cancelled: 'bg-error/10 text-error',
};

export default function MyAccount() {
  const navigate = useNavigate();
  const { account, logout, setAccount } = useCustomer();
  const { items, setQuantity, removeItem, clear } = useCart();
  const [tab, setTab] = useState('bag');
  const [orders, setOrders] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ name: account?.name || '', email: account?.email || '' });
  const [password, setPassword] = useState('');

  const bagTotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);

  useEffect(() => {
    if (!account) return;
    setProfile({ name: account.name || '', email: account.email || '' });
    loadBagIntoCart();
  }, [account]);

  useEffect(() => {
    if (!account) return;
    setLoading(true);
    getMyOrders()
      .then((data) => {
        setOrders(data.orders || []);
        setBills(data.bills || []);
      })
      .catch(() => toast.error('Could not load your orders.'))
      .finally(() => setLoading(false));
  }, [account, tab]);

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      const data = await updateCustomerProfile(profile);
      setAccount({ ...account, ...data.account });
      toast.success(data.message || 'Profile updated.');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not save your details.');
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    try {
      const data = await setCustomerPassword({ password });
      toast.success(data.message || 'Password saved.');
      setPassword('');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not set a password.');
    }
  };

  const signOut = async () => {
    await logout();
    clear();
    toast.info('Signed out.');
    navigate('/', { replace: true });
  };

  return (
    <div className="container-x py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="mt-2 font-display text-4xl text-navy sm:text-5xl">
            {account?.name ? `Namaste, ${account.name.split(' ')[0]}` : 'My account'}
          </h1>
          <p className="mt-2 text-sm text-ink/50">
            {account?.mobile ? `+91 ${account.mobile}` : ''}{' '}
            {account?.email ? `· ${account.email}` : ''}
          </p>
        </div>
        <button type="button" onClick={signOut} className="btn-outline btn-sm">
          <IconLogout size={14} /> Sign out
        </button>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setTab(option.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-medium transition ${
              tab === option.id ? 'bg-navy text-surface' : 'border border-navy/10 text-ink/55 hover:border-gold'
            }`}
          >
            <option.icon size={14} />
            {option.label}
            {option.id === 'bag' && items.length > 0 && (
              <span className="rounded-full bg-gold px-1.5 text-[10px] font-bold text-navy">{items.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-7">
        {tab === 'bag' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-navy/10 bg-surface">
              {items.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <IconBag size={30} className="mx-auto text-navy/20" />
                  <p className="mt-3 font-display text-2xl text-navy">Your bag is empty</p>
                  <p className="mt-1 text-sm text-ink/50">Pieces you add are saved to your account.</p>
                  <Link to="/collections" className="btn-navy btn-sm mt-5">
                    Browse the collection
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-navy/5">
                  {items.map((item) => (
                    <li key={item.key} className="flex gap-4 p-4">
                      <img src={item.image} alt="" className="h-24 w-20 flex-none rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-navy">{item.name}</p>
                        <p className="mt-0.5 text-xs text-ink/45">
                          {item.category} · Size {item.size}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-navy">{formatINR(item.price)}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex items-center rounded-full border border-navy/15">
                            <button
                              type="button"
                              onClick={() => setQuantity(item.key, item.quantity - 1)}
                              className="px-2.5 py-1 text-navy/60"
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="min-w-[26px] text-center text-xs">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => setQuantity(item.key, item.quantity + 1)}
                              className="px-2.5 py-1 text-navy/60"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.key)}
                            className="text-[11px] text-ink/40 underline underline-offset-4 hover:text-error"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <aside className="h-fit rounded-2xl border border-navy/10 bg-surface p-5">
              <p className="font-display text-xl text-navy">Bag summary</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-ink/50">Items</span>
                <span className="font-medium">{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-ink/50">Subtotal</span>
                <span className="font-semibold text-navy">{formatINR(bagTotal)}</span>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-ink/40">
                GST and delivery are calculated at checkout. Coupons you win can be applied there.
              </p>
              <Link to="/checkout" className={`btn-navy mt-5 w-full ${items.length ? '' : 'pointer-events-none opacity-40'}`}>
                Proceed to checkout
              </Link>
              <Link to="/collections" className="btn-outline mt-2 w-full">
                Keep shopping
              </Link>
            </aside>
          </div>
        )}

        {tab === 'orders' && (
          <div className="space-y-4">
            {loading && <p className="text-sm text-ink/45">Loading your orders…</p>}
            {!loading && orders.length === 0 && (
              <div className="rounded-2xl border border-dashed border-navy/15 bg-white/60 px-6 py-16 text-center">
                <IconPackage size={30} className="mx-auto text-navy/20" />
                <p className="mt-3 font-display text-2xl text-navy">No online orders yet</p>
                <p className="mt-1 text-sm text-ink/50">Orders placed with this number or email will appear here.</p>
                <Link to="/collections" className="btn-navy btn-sm mt-5">
                  Start shopping
                </Link>
              </div>
            )}
            {orders.map((order) => (
              <div key={order._id} className="rounded-2xl border border-navy/10 bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl text-navy">{order.orderId}</p>
                    <p className="mt-0.5 text-xs text-ink/45">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      · {order.items?.length || 0} item(s) · {order.paymentMethod?.toUpperCase()}
                    </p>
                  </div>
                  <span className={`badge ${STATUS_TONE[order.status] || 'bg-navy/5 text-navy'}`}>{order.status}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(order.items || []).slice(0, 4).map((item) => (
                    <div key={`${order._id}-${item.productId}-${item.size}`} className="flex items-center gap-2 rounded-lg bg-navy/5 p-1.5 pr-3">
                      {item.image && <img src={item.image} alt="" className="h-9 w-8 rounded object-cover" />}
                      <span className="text-[11px] text-navy/70">
                        {item.productName} · {item.size} × {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-navy/5 pt-3">
                  <p className="text-sm">
                    <span className="text-ink/45">Total </span>
                    <span className="font-semibold text-navy">{formatINR(order.grandTotal)}</span>
                  </p>
                  <Link to={`/track/${order.orderId}`} className="btn-outline btn-sm">
                    Track order
                  </Link>
                </div>
              </div>
            ))}

            {bills.length > 0 && (
              <div className="rounded-2xl border border-navy/10 bg-surface p-5">
                <p className="font-display text-xl text-navy">In-store bills</p>
                <p className="mt-1 text-xs text-ink/45">Bills the shop generated against your number.</p>
                <ul className="mt-3 divide-y divide-navy/5">
                  {bills.map((bill) => (
                    <li key={bill._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="text-navy/70">{bill.billNumber}</span>
                      <span className="text-xs text-ink/40">
                        {new Date(bill.createdAt).toLocaleDateString('en-IN')}
                      </span>
                      <span className="font-semibold text-navy">{formatINR(bill.grandTotal)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === 'profile' && (
          <div className="grid gap-6 md:grid-cols-2">
            <form onSubmit={saveProfile} className="rounded-2xl border border-navy/10 bg-surface p-6">
              <p className="font-display text-xl text-navy">Your details</p>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">
                  Full name
                </span>
                <input
                  value={profile.name}
                  onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                  className="input"
                  placeholder="Your name"
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">
                  Email address
                </span>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                  className="input"
                  placeholder="you@example.com"
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">
                  Mobile (login)
                </span>
                <input value={account?.mobile || ''} disabled className="input opacity-60" />
              </label>
              <button type="submit" className="btn-navy mt-5 w-full">
                Save details
              </button>
            </form>

            <form onSubmit={savePassword} className="rounded-2xl border border-navy/10 bg-surface p-6">
              <p className="font-display text-xl text-navy">Email password</p>
              <p className="mt-1 text-xs leading-relaxed text-ink/45">
                Optional. Set a password to login with your email instead of an OTP.
              </p>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">
                  New password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input"
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
              </label>
              <button type="submit" className="btn-outline mt-5 w-full">
                <IconCheck size={14} /> Save password
              </button>
              {account?.hasPassword && (
                <p className="mt-3 text-[11px] text-green-700">A password is already set on this account.</p>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
