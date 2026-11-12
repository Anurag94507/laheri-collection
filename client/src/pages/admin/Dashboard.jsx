import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../../api/index.js';
import { AcquisitionLine, CategoryDonut, RevenueBars } from '../../components/Charts.jsx';
import { formatDateTime, formatINR } from '../../utils/format.js';
import {
  IconChat,
  IconGift,
  IconPackage,
  IconReceipt,
  IconTag,
  IconUsers,
} from '../../components/Icons.jsx';

const STAT_TEMPLATES = [
  { key: 'todaySales', label: 'Today’s sales', prefix: '₹', sub: 'todayBillCount', subLabel: 'offline bills', icon: IconReceipt, accent: 'bg-gold/15 text-gold-dark' },
  { key: 'monthRevenue', label: 'Revenue this month', prefix: '₹', sub: 'monthOrders', subLabel: 'online orders', icon: IconTag, accent: 'bg-navy/10 text-navy' },
  { key: 'totalCustomers', label: 'CRM contacts', sub: 'newCustomersWeek', subLabel: 'new this week', icon: IconUsers, accent: 'bg-success/10 text-success' },
  { key: 'messagesThisMonth', label: 'Messages sent', sub: 'chatbotToday', subLabel: 'chats today', icon: IconChat, accent: 'bg-gold/15 text-gold-dark' },
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => setError('Could not load the dashboard. Is the API running?'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl bg-white/70" />
        ))}
      </div>
    );
  }

  if (error) return <div className="rounded-xl border border-error/20 bg-error/5 p-6 text-sm text-error">{error}</div>;

  const { stats, weeklyRevenue, categorySales, acquisition, lowStock, recent } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_TEMPLATES.map((template) => {
          const value = stats[template.key] || 0;
          return (
            <div key={template.key} className="admin-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">{template.label}</p>
                  <p className="mt-2 font-display text-[30px] leading-none text-navy">
                    {template.prefix}{template.prefix ? Number(value).toLocaleString('en-IN') : Number(value).toLocaleString('en-IN')}
                  </p>
                </div>
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${template.accent}`}>
                  <template.icon size={17} />
                </span>
              </div>
              <p className="mt-3 text-[11px] text-ink/45">
                <span className="font-semibold text-navy/70">{stats[template.sub] || 0}</span> {template.subLabel}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="admin-card xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl">Weekly revenue</h2>
              <p className="text-[11px] text-ink/40">Bills and online orders combined</p>
            </div>
            <span className="badge bg-gold/15 text-gold-dark">Last 7 days</span>
          </div>
          <RevenueBars data={weeklyRevenue} />
        </div>

        <div className="admin-card">
          <div className="mb-3">
            <h2 className="font-display text-xl">Category mix</h2>
            <p className="text-[11px] text-ink/40">Share of sales value</p>
          </div>
          <CategoryDonut data={categorySales} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="admin-card xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl">Customer growth</h2>
              <p className="text-[11px] text-ink/40">New CRM contacts per week</p>
            </div>
            <span className="text-[11px] text-ink/40">{stats.newCustomersWeek} new this week</span>
          </div>
          <AcquisitionLine data={acquisition} />
        </div>

        <div className="admin-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl">Low stock</h2>
            <span className="badge bg-error/10 text-error">{stats.lowStockCount} items</span>
          </div>
          {lowStock.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink/40">Every piece is well stocked.</p>
          ) : (
            <ul className="space-y-2.5">
              {lowStock.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <img src={item.image} alt="" className="h-10 w-8 flex-none rounded object-cover" />
                  <span className="min-w-0 flex-1 truncate text-xs text-navy/75">{item.name}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${item.stock <= 2 ? 'text-error' : 'text-gold-dark'}`}>{item.stock} left</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/admin/products" className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-navy/50 hover:text-navy">
            Restock catalogue →
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="admin-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl">Recent activity</h2>
            <div className="flex gap-2">
              <Link to="/admin/orders" className="text-[11px] text-navy/45 hover:text-navy">Orders</Link>
              <span className="text-navy/20">·</span>
              <Link to="/admin/billing" className="text-[11px] text-navy/45 hover:text-navy">Bills</Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.12em] text-ink/35">
                  <th className="pb-2 font-medium">Reference</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                  <th className="pb-2 text-right font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((entry) => (
                  <tr key={`${entry.kind}-${entry.id}`} className="border-t border-navy/5">
                    <td className="py-2.5 font-mono text-[11px] text-navy/70">{entry.reference}</td>
                    <td className="py-2.5 text-ink/60">{entry.name}</td>
                    <td className="py-2.5">
                      <span className={`badge ${entry.kind === 'Offline bill' ? 'bg-navy/8 text-navy/60' : 'bg-gold/15 text-gold-dark'}`}>{entry.kind}</span>
                    </td>
                    <td className="py-2.5 text-right font-medium text-navy">{formatINR(entry.amount)}</td>
                    <td className="py-2.5 text-right text-ink/35">{formatDateTime(entry.createdAt)}</td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-ink/40">No sales yet — create your first bill.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-card">
          <h2 className="font-display text-xl">Quick actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {[
              { to: '/admin/billing', label: 'New bill', icon: IconReceipt },
              { to: '/admin/products', label: 'Add product', icon: IconPackage },
              { to: '/admin/bulk-send', label: 'Bulk send', icon: IconChat },
              { to: '/admin/games', label: 'Coupons', icon: IconGift },
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="flex flex-col items-start gap-2 rounded-lg border border-navy/10 p-3 text-[11px] font-medium text-navy/70 transition hover:border-gold hover:bg-gold/5"
              >
                <action.icon size={16} className="text-gold-dark" />
                {action.label}
              </Link>
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-navy p-4 text-parchment/70">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Storefront chatbot</p>
            <p className="mt-1 font-display text-2xl text-surface">{stats.chatbotToday} conversations</p>
            <p className="mt-1 text-[11px]">today · replies automatically in English and Hinglish</p>
            <Link to="/chatbot" className="mt-3 inline-block text-[11px] font-medium text-gold underline underline-offset-4">Open assistant</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
