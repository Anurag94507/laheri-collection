import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { trackOrder } from '../api/index.js';
import PageHero from '../components/PageHero.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { formatDateTime, formatINRDecimal, orderStatusSteps, prettyStatus } from '../utils/format.js';
import { IconCheck, IconSearch, IconTruck, IconWhatsApp } from '../components/Icons.jsx';

export default function TrackOrder() {
  const { orderId } = useParams();
  const { settings } = useSettings();
  const [value, setValue] = useState(orderId || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async (id) => {
    if (!id.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await trackOrder(id.trim().toUpperCase());
      setOrder(data);
    } catch (requestError) {
      setOrder(null);
      setError(requestError?.response?.data?.error || 'Could not find that order.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) search(orderId);
  }, [orderId]);

  const currentIndex = order ? Math.max(orderStatusSteps.indexOf(order.status), 0) : -1;
  const cancelled = order?.status === 'cancelled';

  return (
    <div>
      <PageHero
        eyebrow="Order status"
        title="Where is my parcel?"
        description="Enter the order ID from your confirmation message. We keep the status updated as it moves from our shelf to your door."
        compact
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            search(value);
          }}
          className="mt-6 flex max-w-xl items-center gap-2 rounded-full border border-parchment/20 bg-navy/60 p-1.5 backdrop-blur"
        >
          <IconSearch size={17} className="ml-3 flex-none text-parchment/50" />
          <input
            value={value}
            onChange={(event) => setValue(event.target.value.toUpperCase())}
            placeholder="ORD-2025-1201"
            className="min-w-0 flex-1 bg-transparent px-1 font-mono text-sm tracking-wider text-surface outline-none placeholder:text-parchment/35"
            aria-label="Order ID"
          />
          <button type="submit" disabled={loading} className="btn-gold btn-sm">{loading ? 'Checking…' : 'Track'}</button>
        </form>
      </PageHero>

      <div className="container-x py-12">
        {!order && !error && (
          <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-navy/15 bg-white/60 p-8 text-center">
            <p className="font-display text-2xl">No order loaded</p>
            <p className="mt-2 text-sm text-ink/50">
              Try the demo order <button type="button" onClick={() => { setValue('ORD-2025-1201'); search('ORD-2025-1201'); }} className="font-mono font-semibold text-gold-dark underline underline-offset-4">ORD-2025-1201</button> or enter your own.
            </p>
            <p className="mt-4 text-xs text-ink/40">You can also WhatsApp us on +91 {settings?.shop?.phone} with your order ID.</p>
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-xl rounded-2xl border border-error/25 bg-error/5 p-6 text-center text-sm text-error">
            {error}
          </div>
        )}

        {order && (
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-navy/10 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-navy/10 pb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-ink/40">Order</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-navy">{order.orderId}</p>
                  <p className="mt-1 text-xs text-ink/45">Placed {formatDateTime(order.createdAt)} · {order.customer?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-ink/40">Total</p>
                  <p className="mt-1 font-display text-2xl">{formatINRDecimal(order.grandTotal)}</p>
                  <p className="mt-1 text-xs capitalize text-ink/45">{order.paymentMethod} · {order.paymentStatus}</p>
                </div>
              </div>

              {cancelled ? (
                <div className="mt-5 rounded-xl bg-error/5 p-4 text-sm text-error">
                  This order was cancelled. If this is unexpected, call us on +91 {settings?.shop?.phone}.
                </div>
              ) : (
                <div className="mt-6">
                  <div className="flex items-center justify-between gap-1">
                    {orderStatusSteps.map((status, index) => {
                      const complete = index <= currentIndex;
                      return (
                        <div key={status} className="flex flex-1 flex-col items-center gap-2 text-center">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] ${complete ? 'border-success bg-success text-white' : 'border-navy/15 bg-white text-navy/30'}`}>
                            {complete ? <IconCheck size={14} /> : index + 1}
                          </span>
                          <span className={`text-[10px] font-medium uppercase tracking-[0.08em] ${complete ? 'text-navy' : 'text-ink/35'}`}>{prettyStatus(status)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 h-1 rounded-full bg-navy/10">
                    <div className="h-1 rounded-full bg-success transition-all duration-500" style={{ width: `${((currentIndex + 1) / orderStatusSteps.length) * 100}%` }} />
                  </div>
                </div>
              )}

              <div className="mt-6 rounded-xl bg-surface p-4 text-xs text-ink/55">
                <p className="flex items-center gap-2 font-medium text-navy">
                  <IconTruck size={15} className="text-gold-dark" />
                  {order.delivery?.type === 'pickup' ? 'Store pickup' : 'Home delivery'}
                </p>
                <p className="mt-1.5">
                  {order.delivery?.type === 'pickup'
                    ? `${settings?.shop?.address}, ${settings?.shop?.city} — ${settings?.shop?.pincode}`
                    : `${order.delivery?.address}, ${order.delivery?.landmark}, ${order.delivery?.city} ${order.delivery?.pincode}`}
                </p>
                <p className="mt-1.5">{order.delivery?.expected}</p>
              </div>

              <div className="mt-5 space-y-2">
                {order.items.map((item) => (
                  <div key={`${item.productId}-${item.size}`} className="flex items-center gap-3 text-xs">
                    <img src={item.image} alt="" className="h-12 w-10 flex-none rounded object-cover" />
                    <span className="flex-1 text-navy/70">{item.productName} · {item.size} × {item.quantity}</span>
                    <span className="font-medium text-navy">{formatINRDecimal(item.totalPrice)}</span>
                  </div>
                ))}
              </div>

              {order.timeline?.length > 0 && (
                <div className="mt-6 border-t border-navy/10 pt-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-ink/40">Activity</p>
                  <ul className="mt-3 space-y-2 text-xs text-ink/55">
                    {[...order.timeline].reverse().map((entry, index) => (
                      <li key={`${entry.status}-${index}`} className="flex items-center justify-between gap-3">
                        <span>{prettyStatus(entry.status)}</span>
                        <span className="text-ink/35">{formatDateTime(entry.at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3 border-t border-navy/10 pt-5">
                <a
                  href={`https://wa.me/91${settings?.shop?.whatsapp}?text=${encodeURIComponent(`Hello, I need help with order ${order.orderId}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-navy btn-sm"
                >
                  <IconWhatsApp size={14} /> Ask about this order
                </a>
                <a href={`tel:+91${settings?.shop?.phone}`} className="btn-outline btn-sm">Call shop</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
