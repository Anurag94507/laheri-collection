import { useEffect, useState } from 'react';
import { useCustomer } from '../store/customer.js';
import { Link, useNavigate } from 'react-router-dom';
import { createRazorpayOrder, getPaymentConfig, lookupCustomer, placeOrder } from '../api/index.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { useCart } from '../store/cart.js';
import { toast } from '../store/toast.js';
import { cartTotals, formatINRDecimal } from '../utils/format.js';
import { IconArrowLeft, IconArrowRight, IconCheck, IconClock, IconMap, IconTruck, IconWhatsApp } from '../components/Icons.jsx';

const STEPS = ['Contact', 'Delivery', 'Payment'];

const DEMO_PAYMENT_OPTIONS = [
  { value: 'upi', title: 'UPI / PhonePe', note: 'Pay by any UPI app · demo mode' },
  { value: 'card', title: 'Credit / Debit card', note: 'Visa, Mastercard, RuPay · demo mode' },
  { value: 'netbanking', title: 'Net banking', note: 'All major Indian banks · demo mode' },
];

const COD_OPTION = { value: 'cod', title: 'Cash on delivery', note: 'Pay the delivery partner · ₹0 extra' };
const RAZORPAY_OPTION = {
  value: 'razorpay',
  title: 'Pay online',
  note: 'UPI, cards & netbanking · secured by Razorpay',
};

let razorpayScript = null;
function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  if (!razorpayScript) {
    razorpayScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => {
        razorpayScript = null;
        reject(new Error('Could not load the payment window. Check your connection.'));
      };
      document.body.appendChild(script);
    });
  }
  return razorpayScript;
}

export default function Checkout() {
  const { items, coupon } = useCart();
  const clear = useCart((state) => state.clear);
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [errors, setErrors] = useState({});
  const [looking, setLooking] = useState(false);
  const account = useCustomer((state) => state.account);
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    type: 'home',
    address: '',
    landmark: '',
    city: settings?.shop?.city || '',
    pincode: '',
    paymentMethod: 'upi',
    notes: '',
  });

  const gstPercent = settings?.shop?.gstPercent ?? 5;
  const shipping = settings?.shipping || {};
  const previewTotals = cartTotals(items, coupon, gstPercent);

  useEffect(() => {
    getPaymentConfig()
      .then((data) => {
        if (!data?.razorpay?.enabled) return;
        setRazorpayEnabled(true);
        setForm((current) => (current.paymentMethod === 'upi' ? { ...current, paymentMethod: 'razorpay' } : current));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (settings?.shop?.city && !form.city) setForm((current) => ({ ...current, city: settings.shop.city }));
    // Prefill from the signed-in customer account so checkout is one tap.
    if (account) {
      setForm((current) => ({
        ...current,
        name: current.name || account.name || '',
        mobile: current.mobile || account.mobile || '',
        email: current.email || account.email || '',
      }));
    }
  }, [settings?.shop?.city]);

  if (items.length === 0 && !confirmed) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-[38px]">Your bag is empty</h1>
        <p className="mt-2 text-sm text-ink/50">Add a piece before heading to checkout.</p>
        <Link to="/collections" className="btn-navy mt-6">Browse collection</Link>
      </div>
    );
  }

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const checkMobile = async (value) => {
    if (!/^[6-9]\d{9}$/.test(value)) return;
    setLooking(true);
    try {
      const data = await lookupCustomer(value);
      if (data.found) {
        setForm((current) => ({
          ...current,
          name: current.name || data.customer.name || '',
          email: current.email || data.customer.email || '',
          city: data.customer.lastAddress?.city || current.city,
          address: current.address || data.customer.lastAddress?.address || '',
          landmark: current.landmark || data.customer.lastAddress?.landmark || '',
          pincode: current.pincode || data.customer.lastAddress?.pincode || '',
        }));
        toast.info(`Welcome back, ${data.customer.name}. We filled in your last details.`);
      }
    } catch {
      /* lookup is best-effort */
    } finally {
      setLooking(false);
    }
  };

  const validateStep = () => {
    const next = {};
    if (step === 1) {
      if (form.name.trim().length < 2) next.name = 'Please enter your full name.';
      if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) next.mobile = 'Enter a valid 10-digit Indian mobile number.';
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'That email does not look right.';
    }
    if (step === 2 && form.type === 'home') {
      if (form.address.trim().length < 8) next.address = 'Please enter a complete address.';
      if (!/^[1-9]\d{5}$/.test(form.pincode.trim())) next.pincode = 'Enter a valid 6-digit pincode.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    if (step === 1 && form.mobile) checkMobile(form.mobile.trim());
    setStep((current) => Math.min(3, current + 1));
  };

  const payWithRazorpay = async () => {
    const delivery =
      form.type === 'home' && previewTotals.subtotal < Number(shipping.freeAbove || 1999)
        ? Number(shipping.deliveryCharge || 0)
        : 0;
    const amount = cartTotals(items, coupon, gstPercent, delivery).grandTotal;
    const { payment } = await createRazorpayOrder({ amount, receipt: `cart-${Date.now()}` });
    await loadRazorpayScript();

    return new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: payment.keyId,
        order_id: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        name: settings?.shop?.name || 'Laheri Collection',
        description: 'Online order payment',
        prefill: { name: form.name, contact: form.mobile, email: form.email },
        theme: { color: '#0F1B3C' },
        handler: (response) =>
          resolve({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          }),
        modal: { ondismiss: () => reject(new Error('Payment cancelled.')) },
      });
      checkout.on('payment.failed', () => reject(new Error('The payment did not go through.')));
      checkout.open();
    });
  };

  const submit = async () => {
    if (!validateStep()) return;
    setPlacing(true);
    try {
      const payment = form.paymentMethod === 'razorpay' ? await payWithRazorpay() : null;
      const data = await placeOrder({
        customer: { name: form.name.trim(), mobile: form.mobile.trim(), email: form.email.trim() },
        delivery: {
          type: form.type,
          address: form.type === 'home' ? form.address.trim() : '',
          landmark: form.landmark.trim(),
          city: form.city.trim(),
          pincode: form.type === 'home' ? form.pincode.trim() : '',
        },
        items: items.map((item) => ({ productId: item.productId, size: item.size, quantity: item.quantity })),
        couponCode: coupon?.code || '',
        paymentMethod: form.paymentMethod,
        payment,
        notes: form.notes,
      });
      setConfirmed(data.order);
      clear();
      toast.success('Order placed! A confirmation is on its way on WhatsApp.');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not place the order. Please check your details.');
    } finally {
      setPlacing(false);
    }
  };

  if (confirmed) {
    return (
      <div className="container-x flex min-h-[70vh] items-center justify-center py-16">
        <div className="w-full max-w-xl text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success text-white">
            <IconCheck size={30} strokeWidth={2.4} />
          </span>
          <p className="eyebrow mt-6">Order confirmed</p>
          <h1 className="mt-2 text-[42px] leading-none">Thank you, {confirmed.customer.name.split(' ')[0]}</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/55">
            Your order <span className="font-mono font-semibold text-navy">{confirmed.orderId}</span> is confirmed. We
            have sent the details on WhatsApp and our team will call if we need anything.
          </p>

          <div className="mt-8 rounded-2xl border border-navy/10 bg-white p-6 text-left">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-ink/40">Amount</p>
                <p className="font-display text-2xl">{formatINRDecimal(confirmed.grandTotal)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.16em] text-ink/40">Payment</p>
                <p className="text-sm font-medium capitalize text-navy">{confirmed.paymentMethod} · {confirmed.paymentStatus}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs text-ink/55">
              <p className="flex items-center gap-2"><IconTruck size={14} className="text-gold-dark" /> {confirmed.delivery?.type === 'pickup' ? settings?.shipping?.pickupNote : `Expected delivery: ${confirmed.delivery?.expected}`}</p>
              <p className="flex items-center gap-2"><IconMap size={14} className="text-gold-dark" /> {confirmed.delivery?.type === 'pickup' ? settings?.shop?.address : `${confirmed.delivery?.address}, ${confirmed.delivery?.city} ${confirmed.delivery?.pincode}`}</p>
            </div>
            <div className="mt-4 space-y-1 border-t border-navy/10 pt-4 text-xs text-ink/55">
              {confirmed.items.map((item) => (
                <p key={`${item.productId}-${item.size}`} className="flex justify-between gap-4">
                  <span>{item.productName} · {item.size} × {item.quantity}</span>
                  <span>{formatINRDecimal(item.totalPrice)}</span>
                </p>
              ))}
            </div>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to={`/track/${confirmed.orderId}`} className="btn-gold">Track this order</Link>
            <a href={confirmed.whatsappLink} target="_blank" rel="noreferrer" className="btn-navy">
              <IconWhatsApp size={16} /> WhatsApp receipt
            </a>
            <Link to="/collections" className="btn-outline">Keep shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  const deliveryCharge = form.type === 'home' && previewTotals.subtotal < Number(shipping.freeAbove || 1999) ? Number(shipping.deliveryCharge || 0) : 0;
  const totals = cartTotals(items, coupon, gstPercent, deliveryCharge);

  return (
    <div className="container-x py-10 sm:py-14">
      <Link to="/cart" className="inline-flex items-center gap-2 text-xs font-medium text-ink/45 transition hover:text-navy">
        <IconArrowLeft size={14} /> Back to bag
      </Link>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Checkout</p>
          <h1 className="mt-2 text-[38px] leading-none sm:text-[44px]">Almost yours</h1>
        </div>
        <p className="text-xs text-ink/45">No account, no password — we only need a name and mobile number.</p>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <ol className="mb-8 flex items-center gap-2">
            {STEPS.map((label, index) => {
              const number = index + 1;
              const complete = step > number;
              const current = step === number;
              return (
                <li key={label} className="flex flex-1 items-center gap-2">
                  <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-semibold ${complete ? 'bg-success text-white' : current ? 'bg-navy text-surface' : 'border border-navy/15 text-navy/40'}`}>
                    {complete ? <IconCheck size={14} /> : number}
                  </span>
                  <span className={`text-[11px] font-medium uppercase tracking-[0.12em] ${current ? 'text-navy' : 'text-ink/35'}`}>{label}</span>
                  {index < STEPS.length - 1 && <span className={`h-px flex-1 ${complete ? 'bg-success/40' : 'bg-navy/10'}`} />}
                </li>
              );
            })}
          </ol>

          <div className="rounded-2xl border border-navy/10 bg-white p-6">
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-2xl">Who are we dressing?</h2>
                  <p className="mt-1 text-xs text-ink/45">We use this to send order updates on WhatsApp. No spam, ever.</p>
                </div>
                <div>
                  <label className="label" htmlFor="name">Full name *</label>
                  <input id="name" value={form.name} onChange={(event) => set('name', event.target.value)} className="input" placeholder="Aditya Sharma" autoComplete="name" />
                  {errors.name && <p className="mt-1 text-[11px] text-error">{errors.name}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="mobile">Mobile number *</label>
                  <input
                    id="mobile"
                    value={form.mobile}
                    onChange={(event) => set('mobile', event.target.value.replace(/\D/g, '').slice(0, 10))}
                    onBlur={(event) => checkMobile(event.target.value)}
                    className="input"
                    placeholder="98765 43210"
                    inputMode="numeric"
                    autoComplete="tel"
                  />
                  {looking && <p className="mt-1 text-[11px] text-ink/40">Checking for your previous orders…</p>}
                  {errors.mobile && <p className="mt-1 text-[11px] text-error">{errors.mobile}</p>}
                  <p className="mt-1.5 text-[11px] text-ink/40">We’ll send your order updates on WhatsApp.</p>
                </div>
                <div>
                  <label className="label" htmlFor="email">Email (optional)</label>
                  <input id="email" type="email" value={form.email} onChange={(event) => set('email', event.target.value)} className="input" placeholder="you@example.com" autoComplete="email" />
                  {errors.email && <p className="mt-1 text-[11px] text-error">{errors.email}</p>}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-2xl">How should it reach you?</h2>
                  <p className="mt-1 text-xs text-ink/45">Home delivery or collect from the shop — both are fine.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { value: 'home', title: 'Home delivery', note: `${shipping.deliveryDays || '2–4 working days'} · free above ₹${shipping.freeAbove || 1999}` },
                    { value: 'pickup', title: 'Store pickup', note: 'Ready in 2 hours · free' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => set('type', option.value)}
                      className={`rounded-xl border p-4 text-left transition ${form.type === option.value ? 'border-gold bg-gold/10' : 'border-navy/12 hover:border-gold/60'}`}
                    >
                      <p className="text-sm font-semibold text-navy">{option.title}</p>
                      <p className="mt-1 text-[11px] text-ink/45">{option.note}</p>
                    </button>
                  ))}
                </div>

                {form.type === 'home' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="label" htmlFor="address">Address *</label>
                      <textarea id="address" value={form.address} onChange={(event) => set('address', event.target.value)} rows={2} className="input resize-none" placeholder="House / flat, street, area" />
                      {errors.address && <p className="mt-1 text-[11px] text-error">{errors.address}</p>}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor="landmark">Landmark</label>
                        <input id="landmark" value={form.landmark} onChange={(event) => set('landmark', event.target.value)} className="input" placeholder="Near…" />
                      </div>
                      <div>
                        <label className="label" htmlFor="city">City</label>
                        <input id="city" value={form.city} onChange={(event) => set('city', event.target.value)} className="input" />
                      </div>
                    </div>
                    <div className="sm:w-1/2">
                      <label className="label" htmlFor="pincode">Pincode *</label>
                      <input id="pincode" value={form.pincode} onChange={(event) => set('pincode', event.target.value.replace(/\D/g, '').slice(0, 6))} className="input" placeholder="226001" inputMode="numeric" />
                      {errors.pincode && <p className="mt-1 text-[11px] text-error">{errors.pincode}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-navy/10 bg-surface p-4 text-xs leading-relaxed text-ink/60">
                    <p className="font-semibold text-navy">{settings?.shop?.name}</p>
                    <p className="mt-1">{settings?.shop?.address}, {settings?.shop?.city} {settings?.shop?.pincode}</p>
                    <p className="mt-2 flex items-center gap-2"><IconClock size={14} className="text-gold-dark" /> {shipping.pickupNote}</p>
                    <p className="mt-1 flex items-center gap-2"><IconMap size={14} className="text-gold-dark" /> {settings?.shop?.mapsLink}</p>
                  </div>
                )}

                <div>
                  <label className="label" htmlFor="notes">Order notes (optional)</label>
                  <input id="notes" value={form.notes} onChange={(event) => set('notes', event.target.value)} className="input" placeholder="Alteration request, delivery timing…" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-2xl">How would you like to pay?</h2>
                  <p className="mt-1 text-xs text-ink/45">
                    {razorpayEnabled
                      ? 'Pay securely by UPI, card or netbanking, or choose cash on delivery.'
                      : 'Online payments are simulated until Razorpay keys are added.'}
                  </p>
                </div>
                <div className="space-y-2.5">
                  {(razorpayEnabled ? [RAZORPAY_OPTION, COD_OPTION] : [...DEMO_PAYMENT_OPTIONS, COD_OPTION]).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => set('paymentMethod', option.value)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${form.paymentMethod === option.value ? 'border-gold bg-gold/10' : 'border-navy/12 hover:border-gold/50'}`}
                    >
                      <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border text-[11px] font-semibold ${form.paymentMethod === option.value ? 'border-gold bg-gold text-navy' : 'border-navy/20 text-navy/40'}`}>
                        {form.paymentMethod === option.value ? <IconCheck size={14} /> : option.title.charAt(0)}
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-navy">{option.title}</span>
                        <span className="mt-0.5 block text-[11px] text-ink/45">{option.note}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="rounded-xl bg-surface p-4 text-[11px] leading-relaxed text-ink/50">
                  By placing this order you agree to our exchange policy: exchange within 7 days with bill, no returns
                  on sale items, free alteration within 3 days.
                </div>
              </div>
            )}

            <div className="mt-7 flex items-center justify-between gap-3">
              {step > 1 ? (
                <button type="button" onClick={() => setStep((current) => current - 1)} className="inline-flex items-center gap-2 text-xs font-medium text-ink/50 hover:text-navy">
                  <IconArrowLeft size={14} /> Back
                </button>
              ) : (
                <span />
              )}
              {step < 3 ? (
                <button type="button" onClick={nextStep} className="btn-navy">
                  Continue <IconArrowRight size={15} />
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={placing} className="btn-gold">
                  {placing ? 'Placing order…' : `Place order · ${formatINRDecimal(totals.grandTotal)}`}
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-navy/10 bg-white p-6">
            <h2 className="font-display text-2xl">Your order</h2>
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.key} className="flex gap-3">
                  <img src={item.image} alt="" className="h-16 w-14 flex-none rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy">{item.name}</p>
                    <p className="text-[11px] text-ink/40">Size {item.size} · Qty {item.quantity}</p>
                  </div>
                  <p className="text-xs font-medium text-navy">{formatINRDecimal(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <dl className="mt-5 space-y-2.5 border-t border-navy/10 pt-4 text-xs">
              <div className="flex justify-between text-ink/55"><dt>Subtotal</dt><dd>{formatINRDecimal(totals.subtotal)}</dd></div>
              {totals.discount > 0 && <div className="flex justify-between text-success"><dt>Discount ({coupon?.code})</dt><dd>− {formatINRDecimal(totals.discount)}</dd></div>}
              <div className="flex justify-between text-ink/55"><dt>GST ({totals.gstPercent}%)</dt><dd>{formatINRDecimal(totals.gstAmount)}</dd></div>
              <div className="flex justify-between text-ink/55"><dt>Delivery</dt><dd>{deliveryCharge > 0 ? formatINRDecimal(deliveryCharge) : 'Free'}</dd></div>
              <div className="flex justify-between border-t border-navy/10 pt-3 text-sm font-semibold text-navy"><dt>Total</dt><dd>{formatINRDecimal(totals.grandTotal)}</dd></div>
            </dl>
            <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-ink/40">
              <IconTruck size={14} className="mt-0.5 flex-none text-gold-dark" />
              {form.type === 'pickup' ? 'Collect from the shop in about 2 hours.' : `Delivered in ${shipping.deliveryDays || '2–4 working days'}.`} You will get a WhatsApp update when it is dispatched.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
