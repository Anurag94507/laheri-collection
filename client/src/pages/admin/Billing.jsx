import { useEffect, useMemo, useState } from 'react';
import { createBill, getBills, getProducts, sendBillReceipt } from '../../api/index.js';
import { toast } from '../../store/toast.js';
import { formatINR } from '../../utils/format.js';
import { IconPlus, IconReceipt, IconTrash, IconWhatsApp } from '../../components/Icons.jsx';

const PAYMENTS = ['cash', 'upi', 'card'];

const emptyRow = () => ({ key: Date.now() + Math.random(), productId: '', size: '', quantity: 1, unitPrice: '' });

export default function Billing() {
  const [products, setProducts] = useState([]);
  const [bills, setBills] = useState([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    paymentMethod: 'cash',
    extraDiscount: 0,
    gstPercent: 5,
    sendReceipt: true,
    saveToCrm: true,
    notes: '',
  });
  const [rows, setRows] = useState([emptyRow()]);

  useEffect(() => {
    getProducts({ limit: 200, page: 1 })
      .then((data) => setProducts(data.items || []))
      .catch(() => toast.error('Could not load products.'));
  }, []);

  const loadBills = () => {
    getBills({ q: query || undefined, limit: 20 })
      .then((data) => setBills(data.items || data.bills || []))
      .catch(() => {});
  };

  useEffect(() => {
    const timer = setTimeout(loadBills, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const setRow = (key, patch) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const pickProduct = (row, productId) => {
    const product = products.find((entry) => entry._id === productId);
    setRow(row.key, {
      productId,
      size: product?.sizes?.[0] || 'Free Size',
      unitPrice: product ? (product.discountPrice > 0 ? product.discountPrice : product.price) : '',
    });
  };

  const subtotal = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.unitPrice) || 0) * (Number(row.quantity) || 0), 0),
    [rows]
  );
  const discount = Number(form.extraDiscount) || 0;
  const taxable = Math.max(subtotal - discount, 0);
  const gst = Math.round((taxable * (Number(form.gstPercent) || 0)) / 100);
  const grandTotal = taxable + gst;

  const submit = async (event) => {
    event.preventDefault();
    const items = rows
      .filter((row) => row.productId || row.unitPrice)
      .map((row) => ({
        productId: row.productId || undefined,
        size: row.size,
        quantity: Number(row.quantity) || 1,
        unitPrice: Number(row.unitPrice) || undefined,
      }));
    if (!items.length) return toast.error('Add at least one item to the bill.');
    setBusy(true);
    try {
      const data = await createBill({
        customer: { name: form.name, mobile: form.mobile, email: form.email },
        items,
        extraDiscount: discount,
        gstPercent: Number(form.gstPercent),
        paymentMethod: form.paymentMethod,
        sendReceipt: form.sendReceipt,
        saveToCrm: form.saveToCrm,
        notes: form.notes,
      });
      setResult(data);
      toast.success(data.message);
      setRows([emptyRow()]);
      setForm((current) => ({ ...current, name: '', mobile: '', email: '', notes: '', extraDiscount: 0 }));
      loadBills();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not create the bill.');
    } finally {
      setBusy(false);
    }
  };

  const sendReceipt = async (bill) => {
    try {
      const data = await sendBillReceipt(bill._id);
      toast.success(data.message);
      if (data.whatsappLink) window.open(data.whatsappLink, '_blank', 'noopener');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not send the receipt.');
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
      <form onSubmit={submit} className="rounded-2xl border border-navy/10 bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-xl text-navy">New walk-in bill</p>
            <p className="mt-1 text-[11px] text-ink/40">Saved to bills and added to CRM automatically.</p>
          </div>
          <IconReceipt size={20} className="text-gold-dark" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block sm:col-span-1">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">Name</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="admin-input py-2 text-sm" placeholder="Customer name" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">Mobile</span>
            <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="admin-input py-2 text-sm" placeholder="10-digit" inputMode="numeric" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">Email</span>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="admin-input py-2 text-sm" placeholder="optional" />
          </label>
        </div>

        <div className="mt-5 space-y-2">
          {rows.map((row, index) => (
            <div key={row.key} className="grid grid-cols-12 items-end gap-2">
              <label className="col-span-5 block">
                {index === 0 && (
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">Item</span>
                )}
                <select value={row.productId} onChange={(e) => pickProduct(row, e.target.value)} className="admin-input py-2 text-xs">
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 block">
                {index === 0 && <span className="mb-1.5 block text-[10px] text-navy/50">Size</span>}
                <input value={row.size} onChange={(e) => setRow(row.key, { size: e.target.value })} className="admin-input py-2 text-xs" placeholder="Size" />
              </label>
              <label className="col-span-2 block">
                {index === 0 && <span className="mb-1.5 block text-[10px] text-navy/50">Qty</span>}
                <input type="number" min="1" value={row.quantity} onChange={(e) => setRow(row.key, { quantity: e.target.value })} className="admin-input py-2 text-xs" />
              </label>
              <label className="col-span-2 block">
                {index === 0 && <span className="mb-1.5 block text-[10px] text-navy/50">Price</span>}
                <input type="number" min="0" value={row.unitPrice} onChange={(e) => setRow(row.key, { unitPrice: e.target.value })} className="admin-input py-2 text-xs" placeholder="₹" />
              </label>
              <button
                type="button"
                onClick={() => setRows((current) => (current.length === 1 ? [emptyRow()] : current.filter((entry) => entry.key !== row.key)))}
                className="col-span-1 mb-1 flex h-8 w-8 items-center justify-center rounded-full text-ink/30 hover:bg-error/10 hover:text-error"
                aria-label="Remove line"
              >
                <IconTrash size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setRows((current) => [...current, emptyRow()])} className="flex items-center gap-1.5 text-[11px] font-medium text-gold-dark">
            <IconPlus size={13} /> Add another item
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">Extra discount</span>
            <input type="number" min="0" value={form.extraDiscount} onChange={(e) => setForm({ ...form, extraDiscount: e.target.value })} className="admin-input py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">GST %</span>
            <input type="number" min="0" value={form.gstPercent} onChange={(e) => setForm({ ...form, gstPercent: e.target.value })} className="admin-input py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">Payment</span>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="admin-input py-2 text-sm">
              {PAYMENTS.map((option) => (
                <option key={option} value={option}>
                  {option.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-xl bg-navy/5 px-4 py-3 text-sm">
          <div className="flex justify-between text-[11px] text-ink/50">
            <span>Subtotal</span>
            <span>{formatINR(subtotal)}</span>
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-ink/50">
            <span>Discount</span>
            <span>− {formatINR(discount)}</span>
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-ink/50">
            <span>GST ({form.gstPercent}%)</span>
            <span>{formatINR(gst)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-navy/10 pt-2 font-semibold text-navy">
            <span>Total</span>
            <span>{formatINR(grandTotal)}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-ink/55">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.saveToCrm} onChange={(e) => setForm({ ...form, saveToCrm: e.target.checked })} className="h-4 w-4 accent-[#C9A84C]" />
            Add to CRM
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.sendReceipt} onChange={(e) => setForm({ ...form, sendReceipt: e.target.checked })} className="h-4 w-4 accent-[#C9A84C]" />
            Send WhatsApp receipt
          </label>
        </div>

        <button type="submit" disabled={busy} className="btn-navy mt-5 w-full disabled:opacity-60">
          {busy ? 'Saving bill…' : `Generate bill · ${formatINR(grandTotal)}`}
        </button>

        {result?.bill && (
          <div className="mt-4 rounded-xl border border-green-600/25 bg-green-50/70 p-4">
            <p className="font-display text-lg text-navy">Bill {result.bill.billNumber} saved</p>
            <p className="mt-1 text-[11px] text-ink/50">
              {result.bill.customer.name} · {formatINR(result.bill.grandTotal)} · {result.bill.paymentMethod.toUpperCase()}
            </p>
            {result.whatsappLink && (
              <a href={result.whatsappLink} target="_blank" rel="noreferrer" className="btn-gold btn-sm mt-3">
                <IconWhatsApp size={14} /> Open WhatsApp receipt
              </a>
            )}
          </div>
        )}
      </form>

      <div className="rounded-2xl border border-navy/10 bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 px-5 py-4">
          <div>
            <p className="font-display text-xl text-navy">Offline bills</p>
            <p className="text-[11px] text-ink/40">Every in-store bill, stored permanently</p>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bill / name / mobile"
            className="admin-input w-52 py-1.5 text-xs"
          />
        </div>
        <div className="max-h-[560px] overflow-y-auto">
          <ul className="divide-y divide-navy/5">
            {bills.map((bill) => (
              <li key={bill._id} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[11px] text-navy">{bill.billNumber}</p>
                  <p className="text-xs font-semibold text-navy">{formatINR(bill.grandTotal)}</p>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-ink/45">
                  <span className="truncate">
                    {bill.customer?.name} · {bill.customer?.mobile}
                  </span>
                  <span>{bill.paymentMethod?.toUpperCase()}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[10px] text-ink/35">
                    {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => sendReceipt(bill)}
                    className="flex items-center gap-1 text-[10px] font-medium text-green-700 hover:underline"
                  >
                    <IconWhatsApp size={12} /> Send receipt
                  </button>
                </div>
              </li>
            ))}
            {bills.length === 0 && <li className="px-5 py-10 text-center text-xs text-ink/40">No bills yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
