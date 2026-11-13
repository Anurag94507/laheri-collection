import { useEffect, useState } from 'react';
import {
  createProduct,
  deleteProduct,
  getCategories,
  getProducts,
  updateProduct,
} from '../../api/index.js';
import { toast } from '../../store/toast.js';
import { formatINR } from '../../utils/format.js';
import { IconPackage, IconPlus, IconTrash } from '../../components/Icons.jsx';

const EMPTY = {
  name: '',
  category: 'Kurta',
  price: '',
  discountPrice: '',
  stock: 10,
  fabric: '',
  sizes: 'S,M,L,XL,XXL',
  colors: '',
  description: '',
  images: '',
  isFeatured: false,
  isNewArrival: true,
};

export default function AdminProducts() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = () => {
    setLoading(true);
    getProducts({ limit: 200, q: query || undefined })
      .then((data) => setItems(data.items || []))
      .catch(() => toast.error('Could not load products.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getCategories()
      .then((list) => setCategories(list || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error('Product name is required.');
    if (!(Number(form.price) > 0)) return toast.error('Enter a selling price.');
    setBusy(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        discountPrice: form.discountPrice === '' ? 0 : Number(form.discountPrice),
        stock: Number(form.stock) || 0,
        sizes: form.sizes.split(',').map((value) => value.trim()).filter(Boolean),
        colors: form.colors.split(',').map((value) => value.trim()).filter(Boolean),
        images: form.images.split(',').map((value) => value.trim()).filter(Boolean),
      };
      const data = editing ? await updateProduct(editing, payload) : await createProduct(payload);
      toast.success(data.message);
      setForm(EMPTY);
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not save the product.');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (product) => {
    setEditing(product._id);
    setForm({
      name: product.name,
      category: product.category,
      price: product.price,
      discountPrice: product.discountPrice || '',
      stock: product.stock,
      fabric: product.fabric || '',
      sizes: (product.sizes || []).join(','),
      colors: (product.colors || []).join(','),
      description: product.description || '',
      images: (product.images || []).join(','),
      isFeatured: Boolean(product.isFeatured),
      isNewArrival: Boolean(product.isNewArrival),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (product) => {
    if (!window.confirm(`Remove ${product.name} from the catalogue?`)) return;
    try {
      const data = await deleteProduct(product._id);
      toast.success(data.message);
      load();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not delete the product.');
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <div className="rounded-2xl border border-navy/10 bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 px-5 py-4">
          <div>
            <p className="font-display text-xl text-navy">Catalogue</p>
            <p className="text-[11px] text-ink/40">{items.length} products</p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products"
            className="admin-input w-48 py-1.5 text-xs"
          />
        </div>

        {loading ? (
          <p className="px-5 py-10 text-sm text-ink/40">Loading…</p>
        ) : (
          <ul className="max-h-[620px] divide-y divide-navy/5 overflow-y-auto">
            {items.map((product) => (
              <li key={product._id} className="flex items-center gap-3 px-5 py-3">
                <img src={product.images?.[0]} alt="" className="h-14 w-12 flex-none rounded-lg bg-navy/5 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy">{product.name}</p>
                  <p className="text-[11px] text-ink/40">
                    {product.category} · {product.fabric || '—'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink/45">
                    {formatINR(product.effectivePrice ?? product.price)}
                    {product.discountPrice > 0 && (
                      <span className="ml-1.5 text-ink/30 line-through">{formatINR(product.price)}</span>
                    )}
                    <span className={`ml-2 ${product.stock > 3 ? 'text-ink/35' : 'text-error'}`}>
                      {product.stock} in stock
                    </span>
                  </p>
                </div>
                <button type="button" onClick={() => startEdit(product)} className="btn-outline btn-sm">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(product)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink/30 hover:bg-error/10 hover:text-error"
                  aria-label={`Delete ${product.name}`}
                >
                  <IconTrash size={14} />
                </button>
              </li>
            ))}
            {items.length === 0 && <li className="px-5 py-10 text-center text-xs text-ink/40">No products found.</li>}
          </ul>
        )}
      </div>

      <form onSubmit={submit} className="h-fit rounded-2xl border border-navy/10 bg-surface p-5">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl text-navy">{editing ? 'Edit product' : 'Add product'}</p>
          <IconPackage size={19} className="text-gold-dark" />
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">Name</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="admin-input py-2 text-sm" placeholder="Royal Indigo Kurta" />
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">Category</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="admin-input py-2 text-sm">
              {(categories.length ? categories : [{ name: form.category }]).map((category) => (
                <option key={category.name} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">Fabric</span>
            <input value={form.fabric} onChange={(e) => setForm({ ...form, fabric: e.target.value })} className="admin-input py-2 text-sm" placeholder="Cotton" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">Price ₹</span>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="admin-input py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">Offer price ₹</span>
            <input type="number" value={form.discountPrice} onChange={(e) => setForm({ ...form, discountPrice: e.target.value })} className="admin-input py-2 text-sm" placeholder="0" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">Stock</span>
            <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="admin-input py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">Sizes</span>
            <input value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} className="admin-input py-2 text-sm" />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">Colours</span>
          <input value={form.colors} onChange={(e) => setForm({ ...form, colors: e.target.value })} className="admin-input py-2 text-sm" placeholder="Navy, Ivory" />
        </label>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">Image paths</span>
          <input value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} className="admin-input py-2 text-sm" placeholder="/images/photos/cloth-2.jpg" />
        </label>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">Description</span>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="admin-input resize-none py-2 text-sm" />
        </label>

        <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-ink/55">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="h-4 w-4 accent-[#C9A84C]" />
            Featured
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.isNewArrival} onChange={(e) => setForm({ ...form, isNewArrival: e.target.checked })} className="h-4 w-4 accent-[#C9A84C]" />
            New arrival
          </label>
        </div>

        <button type="submit" disabled={busy} className="btn-navy mt-5 w-full disabled:opacity-60">
          <IconPlus size={14} /> {busy ? 'Saving…' : editing ? 'Save product' : 'Add product'}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setForm(EMPTY);
            }}
            className="btn-outline mt-2 w-full"
          >
            Cancel edit
          </button>
        )}
      </form>
    </div>
  );
}
