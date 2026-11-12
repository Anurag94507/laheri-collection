import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { validateCoupon } from '../api/index.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { useCart } from '../store/cart.js';
import { toast } from '../store/toast.js';
import { cartTotals, formatINRDecimal } from '../utils/format.js';
import { IconArrowRight, IconBag, IconClose, IconMinus, IconPlus, IconTag, IconTruck } from '../components/Icons.jsx';

export default function Cart() {
  const { items, coupon, setCoupon, setQuantity, removeItem } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [code, setCode] = useState(coupon?.code || '');
  const [applying, setApplying] = useState(false);

  const gstPercent = settings?.shop?.gstPercent ?? 5;
  const totals = cartTotals(items, coupon, gstPercent);
  const freeAbove = Number(settings?.shipping?.freeAbove || 1999);
  const remainingForFree = Math.max(freeAbove - totals.subtotal, 0);

  const applyCoupon = async () => {
    if (!code.trim()) return;
    setApplying(true);
    try {
      const data = await validateCoupon({
        code: code.trim(),
        items: items.map((item) => ({ category: item.category, unitPrice: item.price, quantity: item.quantity })),
      });
      setCoupon({
        code: data.coupon.code,
        discountType: data.coupon.discountType,
        discountValue: data.coupon.discountValue,
        applicableOn: data.coupon.applicableOn,
        validUntil: data.coupon.validUntil,
      });
      toast.success(data.message);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not apply that coupon.');
    } finally {
      setApplying(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full border border-gold/40 bg-white text-gold-dark">
          <IconBag size={34} />
        </span>
        <h1 className="mt-6 text-[40px]">Your bag is empty</h1>
        <p className="mt-3 max-w-sm text-sm text-ink/50">
          Nothing here yet. Explore the festive collection, or spin the wheel for a discount before you shop.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/collections" className="btn-gold">Browse collection</Link>
          <Link to="/spin-wheel" className="btn-outline">Spin & win</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-10 sm:py-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Shopping bag</p>
          <h1 className="mt-2 text-[40px] leading-none">Your selection</h1>
        </div>
        <Link to="/collections" className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-navy/55 hover:text-gold-dark sm:block">
          Continue shopping
        </Link>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {remainingForFree > 0 ? (
            <div className="mb-5 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-xs text-navy/70">
              <IconTruck size={15} className="mr-2 inline text-gold-dark" />
              Add {formatINRDecimal(remainingForFree)} more for free delivery.
            </div>
          ) : (
            <div className="mb-5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-xs text-success">
              <IconTruck size={15} className="mr-2 inline" /> Free delivery unlocked.
            </div>
          )}

          <div className="divide-y divide-navy/10 rounded-2xl border border-navy/10 bg-white">
            {items.map((item) => (
              <div key={item.key} className="flex gap-4 p-4 sm:p-5">
                <Link to={`/collections/${item.productId}`} className="h-28 w-24 flex-none overflow-hidden rounded-lg bg-surface">
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/collections/${item.productId}`} className="block truncate font-display text-xl leading-tight text-navy hover:text-gold-dark">
                        {item.name}
                      </Link>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-ink/40">
                        Size {item.size} · {item.category}
                      </p>
                    </div>
                    <button type="button" onClick={() => removeItem(item.key)} className="text-ink/30 transition hover:text-error" aria-label={`Remove ${item.name}`}>
                      <IconClose size={17} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex h-9 items-center rounded-lg border border-navy/15">
                      <button type="button" onClick={() => setQuantity(item.key, item.quantity - 1)} className="flex h-full w-8 items-center justify-center text-navy/60 hover:text-navy" aria-label="Decrease">
                        <IconMinus size={13} />
                      </button>
                      <span className="w-7 text-center text-xs font-medium">{item.quantity}</span>
                      <button type="button" onClick={() => setQuantity(item.key, item.quantity + 1)} className="flex h-full w-8 items-center justify-center text-navy/60 hover:text-navy" aria-label="Increase">
                        <IconPlus size={13} />
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-navy">{formatINRDecimal(item.price * item.quantity)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-navy/10 bg-white p-5">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/55">
              <IconTag size={14} className="text-gold-dark" /> Coupon code
            </p>
            <div className="mt-3 flex gap-2">
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="e.g. FESTIVE20"
                className="input py-2.5 font-mono text-sm tracking-wider"
              />
              <button type="button" onClick={applyCoupon} disabled={applying || !code.trim()} className="btn-navy btn-sm flex-none px-5">
                {applying ? 'Checking…' : 'Apply'}
              </button>
            </div>
            {coupon && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
                <span className="font-mono font-semibold">{coupon.code}</span>
                <button
                  type="button"
                  onClick={() => {
                    setCoupon(null);
                    setCode('');
                  }}
                  className="text-[10px] uppercase tracking-wide underline underline-offset-2"
                >
                  Remove
                </button>
              </div>
            )}
            <p className="mt-3 text-[11px] text-ink/40">
              Won a coupon in a game? It is linked to your mobile number and valid for one use.
            </p>
          </div>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-navy/10 bg-white p-6">
            <h2 className="font-display text-2xl">Order summary</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-ink/60">
                <dt>Subtotal</dt>
                <dd className="text-navy">{formatINRDecimal(totals.subtotal)}</dd>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Coupon discount</dt>
                  <dd>− {formatINRDecimal(totals.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-ink/60">
                <dt>GST ({totals.gstPercent}%)</dt>
                <dd className="text-navy">{formatINRDecimal(totals.gstAmount)}</dd>
              </div>
              <div className="flex justify-between text-ink/60">
                <dt>Delivery</dt>
                <dd className="text-success">{totals.subtotal >= freeAbove ? 'Free' : 'Calculated at checkout'}</dd>
              </div>
              <div className="flex justify-between border-t border-navy/10 pt-4 text-base font-semibold text-navy">
                <dt>Total</dt>
                <dd>{formatINRDecimal(totals.grandTotal)}</dd>
              </div>
            </dl>

            <button type="button" onClick={() => navigate('/checkout')} className="btn-gold mt-6 w-full">
              Proceed to checkout <IconArrowRight size={15} />
            </button>
            <p className="mt-3 text-center text-[10px] uppercase tracking-[0.14em] text-ink/35">
              No account needed · just name & mobile
            </p>
          </div>

          <div className="mt-4 rounded-xl bg-navy/5 p-4 text-[11px] leading-relaxed text-ink/50">
            <p className="font-semibold text-navy/70">Free alteration included</p>
            Bring your bill to the shop within 3 days and our tailor will adjust the fit at no charge. Exchange within
            7 days; sale items are final sale.
          </div>
        </aside>
      </div>
    </div>
  );
}
