import { useEffect, useState } from 'react';
import { getAdminOrders, updateOrderStatus } from '../../api/index.js';
import { formatDateTime, formatINRDecimal } from '../../utils/format.js';
import { toast } from '../../store/toast.js';
import { IconClose, IconTag, IconWhatsApp } from '../../components/Icons.jsx';

const STATUSES = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
const FILTERS = [{ value: 'all', label: 'All' }, ...STATUSES.map((status) => ({ value: status, label: status }))];

const statusTone = {
  placed: 'bg-gold/15 text-gold-dark',
  confirmed: 'bg-navy/10 text-navy',
  packed: 'bg-navy/10 text-navy',
  shipped: 'bg-success/10 text-success',
  delivered: 'bg-success/15 text-success',
  cancelled: 'bg-error/10 text-error',
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({});
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openOrder, setOpenOrder] = useState(null);
  const [saving, setSaving] = useState('');

  const load = () => {
    setLoading(true);
    getAdminOrders({ status, q: search.trim() })
      .then((data) => {
        setOrders(data.items || []);
        setCounts(data.counts || {});
        setError('');
      })
      .catch(() => setError('Could not load orders. Refresh to try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status]);

  const changeStatus = async (order, next) => {
    if (next === order.status) return;
    setSaving(order._id);
    try {
      const data = await updateOrderStatus(order._id, { status: next });
      setOrders((current) => current.map((entry) => (entry._id === order._id ? data.order : entry)));
      setOpenOrder((current) => (current?._id === order._id ? data.order : current));
      setCounts((current) => {
        const updated = { ...current };
        updated[order.status] = Math.max(0, (updated[order.status] || 0) - 1);
        updated[next] = (updated[next] || 0) + 1;
        return updated;
      });
      toast.success(data.message || 'Order updated.');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not update that order.');
    } finally {
      setSaving('');
    }
  };

  const whatsappLink = (order) =>
    `https://wa.me/91${order.customer?.mobile}?text=${encodeURIComponent(
      `Hello ${order.customer?.name || 'ji'}, about your order ${order.orderId} — `
    )}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const active = status === filter.value;
            const count = filter.value === 'all' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[filter.value] || 0;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatus(filter.value)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-medium capitalize transition ${
                  active ? 'border-navy bg-navy text-surface' : 'border-navy/12 text-navy/60 hover:border-gold'
                }`}
              >
                {filter.label} <span className={active ? 'text-gold' : 'text-ink/35'}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && load()}
            placeholder="Order ID, name or mobile"
            className="input h-10 w-full sm:w-64"
          />
          <button type="button" onClick={load} className="btn-outline btn-sm flex-none">
            Search
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-error/20 bg-error/5 p-4 text-sm text-error">{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-white/70" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="admin-card text-center">
          <IconTag size={26} className="mx-auto text-gold-dark" />
          <p className="mt-3 font-display text-xl">No orders here yet</p>
          <p className="mt-1 text-xs text-ink/45">
            {search || status !== 'all' ? 'Try another filter or clear the search.' : 'Online orders will appear the moment a customer checks out.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order._id} className="admin-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button type="button" onClick={() => setOpenOrder(order)} className="min-w-0 text-left">
                  <p className="font-mono text-[12px] font-semibold text-navy">{order.orderId}</p>
                  <p className="mt-1 text-sm font-medium text-navy/80">
                    {order.customer?.name} · {order.customer?.mobile}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink/40">
                    {formatDateTime(order.createdAt)} · {order.items?.length || 0} item(s) ·{' '}
                    {order.delivery?.type === 'pickup' ? 'Shop pickup' : 'Home delivery'}
                  </p>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`badge capitalize ${statusTone[order.status] || 'bg-navy/8 text-navy/60'}`}>{order.status}</span>
                  <span className="badge bg-navy/8 text-navy/60">
                    {order.paymentMethod} · {order.paymentStatus}
                  </span>
                  <span className="font-display text-lg text-navy">{formatINRDecimal(order.grandTotal)}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-navy/5 pt-3">
                <select
                  value={order.status}
                  disabled={saving === order._id}
                  onChange={(event) => changeStatus(order, event.target.value)}
                  className="input h-9 w-auto py-0 text-xs capitalize"
                  aria-label={`Update status for ${order.orderId}`}
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <a href={whatsappLink(order)} target="_blank" rel="noreferrer" className="btn-outline btn-sm inline-flex items-center gap-1.5">
                  <IconWhatsApp size={13} /> Message
                </a>
                <button type="button" onClick={() => setOpenOrder(order)} className="text-[11px] font-medium text-navy/50 hover:text-navy">
                  View details →
                </button>
                {order.customer?.city && <span className="ml-auto text-[11px] text-ink/35">{order.customer.city}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {openOrder && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-navy/60 p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true">
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Order</p>
                <h2 className="font-display text-2xl text-navy">{openOrder.orderId}</h2>
                <p className="mt-1 text-[11px] text-ink/40">{formatDateTime(openOrder.createdAt)}</p>
              </div>
              <button type="button" onClick={() => setOpenOrder(null)} aria-label="Close" className="text-ink/40">
                <IconClose size={20} />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink/35">Customer</p>
                <p className="mt-1 text-sm font-medium text-navy">{openOrder.customer?.name}</p>
                <p className="text-xs text-ink/55">{openOrder.customer?.mobile}</p>
                {openOrder.customer?.email && <p className="text-xs text-ink/55">{openOrder.customer.email}</p>}
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink/35">Delivery</p>
                <p className="mt-1 text-xs leading-relaxed text-ink/60">
                  {openOrder.delivery?.type === 'pickup'
                    ? 'Collect from the shop'
                    : `${openOrder.delivery?.address || ''}${openOrder.delivery?.landmark ? `, ${openOrder.delivery.landmark}` : ''}, ${openOrder.delivery?.city || ''} ${openOrder.delivery?.pincode || ''}`}
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl bg-white">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.12em] text-ink/35">
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Size</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(openOrder.items || []).map((item, index) => (
                    <tr key={`${item.productId}-${index}`} className="border-t border-navy/5">
                      <td className="px-3 py-2 text-navy/75">{item.productName}</td>
                      <td className="px-3 py-2 text-ink/50">{item.size}</td>
                      <td className="px-3 py-2 text-right text-ink/50">{item.quantity}</td>
                      <td className="px-3 py-2 text-right font-medium text-navy">{formatINRDecimal(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-ink/55"><dt>Subtotal</dt><dd>{formatINRDecimal(openOrder.subtotal)}</dd></div>
              {Number(openOrder.discount) > 0 && (
                <div className="flex justify-between text-success"><dt>Discount</dt><dd>− {formatINRDecimal(openOrder.discount)}</dd></div>
              )}
              <div className="flex justify-between text-ink/55"><dt>GST</dt><dd>{formatINRDecimal(openOrder.gstAmount)}</dd></div>
              <div className="flex justify-between text-ink/55"><dt>Delivery</dt><dd>{Number(openOrder.deliveryCharge) > 0 ? formatINRDecimal(openOrder.deliveryCharge) : 'Free'}</dd></div>
              <div className="flex justify-between border-t border-navy/10 pt-2 text-sm font-semibold text-navy">
                <dt>Total</dt><dd>{formatINRDecimal(openOrder.grandTotal)}</dd>
              </div>
            </dl>

            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-ink/35">Timeline</p>
              <ol className="mt-2 space-y-1.5 text-xs text-ink/55">
                {(openOrder.timeline || []).map((entry, index) => (
                  <li key={index} className="flex justify-between gap-3">
                    <span className="capitalize text-navy/70">{entry.status}</span>
                    <span className="text-right text-ink/40">{formatDateTime(entry.at)}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <select
                value={openOrder.status}
                onChange={(event) => changeStatus(openOrder, event.target.value)}
                className="input h-10 w-auto py-0 text-xs capitalize"
              >
                {STATUSES.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <a href={whatsappLink(openOrder)} target="_blank" rel="noreferrer" className="btn-outline btn-sm inline-flex items-center gap-1.5">
                <IconWhatsApp size={13} /> WhatsApp customer
              </a>
              <button type="button" onClick={() => setOpenOrder(null)} className="btn-navy btn-sm ml-auto">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
