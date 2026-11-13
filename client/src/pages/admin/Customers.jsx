import { useEffect, useState } from 'react';
import { getAdminAccounts, getAdminBags, getCustomers } from '../../api/index.js';
import { toast } from '../../store/toast.js';
import { formatINR } from '../../utils/format.js';
import { IconBag, IconDownload, IconSearch, IconUser } from '../../components/Icons.jsx';

const SEGMENTS = [
  { value: 'all', label: 'Everyone' },
  { value: 'new', label: 'New' },
  { value: 'repeat', label: 'Repeat' },
  { value: 'vip', label: 'VIP' },
  { value: 'high-spenders', label: 'High spenders' },
  { value: 'inactive', label: 'Inactive' },
];

export default function Customers() {
  const [tab, setTab] = useState('contacts');
  const [data, setData] = useState({ items: [], counts: {}, totalContacts: 0, total: 0 });
  const [bags, setBags] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [segment, setSegment] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getCustomers({ q: query || undefined, segment, limit: 60 })
      .then((response) => alive && setData(response))
      .catch(() => alive && toast.error('Could not load customers.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [query, segment]);

  useEffect(() => {
    if (tab === 'bags') {
      getAdminBags()
        .then((response) => setBags(response.bags || []))
        .catch(() => toast.error('Could not load saved bags.'));
    }
    if (tab === 'logins') {
      getAdminAccounts()
        .then((response) => setAccounts(response.accounts || []))
        .catch(() => toast.error('Could not load customer logins.'));
    }
  }, [tab]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Contacts', value: data.totalContacts || 0 },
          { label: 'VIPs', value: data.counts?.vip || 0 },
          { label: 'Repeat buyers', value: data.counts?.repeat || 0 },
          { label: 'Inactive 90d', value: data.counts?.inactive || 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-navy/10 bg-surface px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink/40">{stat.label}</p>
            <p className="mt-1 font-display text-3xl text-navy">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {[
            { id: 'contacts', label: 'Contacts', icon: IconUser },
            { id: 'bags', label: 'Saved bags', icon: IconBag },
            { id: 'logins', label: 'Logins', icon: IconUser },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTab(option.id)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-medium transition ${
                tab === option.id ? 'bg-navy text-surface' : 'border border-navy/10 text-ink/55'
              }`}
            >
              <option.icon size={13} />
              {option.label}
            </button>
          ))}
        </div>
        <a href="/api/customers/export.csv" className="btn-outline btn-sm">
          <IconDownload size={13} /> Export CSV
        </a>
      </div>

      {tab === 'contacts' && (
        <div className="rounded-2xl border border-navy/10 bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 px-5 py-4">
            <div className="flex flex-wrap gap-1.5">
              {SEGMENTS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSegment(option.value)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
                    segment === option.value ? 'bg-gold text-navy' : 'bg-navy/5 text-ink/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <form onSubmit={(event) => event.preventDefault()} className="flex items-center gap-2 rounded-full border border-navy/10 px-3 py-1.5">
              <IconSearch size={13} className="text-ink/35" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name or mobile"
                className="w-40 bg-transparent text-xs outline-none placeholder:text-ink/30"
              />
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy/5 text-[10px] uppercase tracking-[0.14em] text-ink/45">
                <tr>
                  <th className="px-5 py-2.5">Customer</th>
                  <th className="px-3 py-2.5">Mobile</th>
                  <th className="px-3 py-2.5">City</th>
                  <th className="px-3 py-2.5">Orders</th>
                  <th className="px-3 py-2.5">Spend</th>
                  <th className="px-3 py-2.5">Last visit</th>
                  <th className="px-3 py-2.5">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {(data.items || []).map((customer) => (
                  <tr key={customer._id}>
                    <td className="px-5 py-2.5">
                      <p className="font-medium text-navy">{customer.name}</p>
                      <p className="text-[10px] text-ink/35">{customer.email || '—'}</p>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-ink/55">{customer.mobile}</td>
                    <td className="px-3 py-2.5 text-ink/50">{customer.city || '—'}</td>
                    <td className="px-3 py-2.5">{customer.totalOrders || 0}</td>
                    <td className="px-3 py-2.5 font-medium text-navy">{formatINR(customer.totalSpend || 0)}</td>
                    <td className="px-3 py-2.5 text-ink/45">
                      {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(customer.tags || []).slice(0, 2).map((tag) => (
                          <span key={tag} className="badge bg-gold/15 text-gold-dark">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {(data.items || []).length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-ink/40">
                      No customers match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'bags' && (
        <div className="rounded-2xl border border-navy/10 bg-surface">
          <div className="border-b border-navy/10 px-5 py-4">
            <p className="font-display text-xl text-navy">Bags saved on customer logins</p>
            <p className="text-[11px] text-ink/40">{bags.length} active bag(s) · collected from the account pages</p>
          </div>
          <ul className="divide-y divide-navy/5">
            {bags.map((bag) => (
              <li key={bag.accountId} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-navy">{bag.name}</p>
                    <p className="text-[11px] text-ink/40">
                      {bag.mobile || bag.email} · {bag.itemCount} item(s) · {formatINR(bag.value)}
                    </p>
                  </div>
                  <p className="text-[10px] text-ink/35">
                    Updated {new Date(bag.updatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {bag.items.slice(0, 5).map((item) => (
                    <span key={item.key} className="rounded-lg bg-navy/5 px-2 py-1 text-[10px] text-navy/60">
                      {item.name} · {item.size} × {item.quantity}
                    </span>
                  ))}
                </div>
              </li>
            ))}
            {bags.length === 0 && <li className="px-5 py-10 text-center text-xs text-ink/40">No saved bags right now.</li>}
          </ul>
        </div>
      )}

      {tab === 'logins' && (
        <div className="rounded-2xl border border-navy/10 bg-surface">
          <div className="border-b border-navy/10 px-5 py-4">
            <p className="font-display text-xl text-navy">Customer logins</p>
            <p className="text-[11px] text-ink/40">{accounts.length} account(s) created from the website</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy/5 text-[10px] uppercase tracking-[0.14em] text-ink/45">
                <tr>
                  <th className="px-5 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Mobile</th>
                  <th className="px-3 py-2.5">Email</th>
                  <th className="px-3 py-2.5">Orders</th>
                  <th className="px-3 py-2.5">Spend</th>
                  <th className="px-3 py-2.5">Bag</th>
                  <th className="px-3 py-2.5">Login type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {accounts.map((account) => (
                  <tr key={account._id}>
                    <td className="px-5 py-2.5 font-medium text-navy">{account.name || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-ink/55">{account.mobile || '—'}</td>
                    <td className="px-3 py-2.5 text-ink/50">{account.email || '—'}</td>
                    <td className="px-3 py-2.5">{account.orders}</td>
                    <td className="px-3 py-2.5 font-medium text-navy">{formatINR(account.spend)}</td>
                    <td className="px-3 py-2.5 text-ink/50">{account.bagItems} item(s)</td>
                    <td className="px-3 py-2.5">
                      <span className="badge bg-navy/5 text-navy/60">
                        {account.hasPassword ? 'OTP + password' : 'OTP'}
                      </span>
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-ink/40">
                      No customer logins yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
