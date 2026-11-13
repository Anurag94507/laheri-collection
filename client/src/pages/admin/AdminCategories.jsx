import { useEffect, useState } from 'react';
import {
  createCategory,
  deleteCategory,
  getAdminCategories,
  updateCategory,
} from '../../api/index.js';
import { toast } from '../../store/toast.js';
import { IconPlus, IconTrash } from '../../components/Icons.jsx';

const EMPTY = { name: '', blurb: '', image: '', active: true };

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    getAdminCategories()
      .then((data) => setCategories(data.categories || []))
      .catch(() => toast.error('Could not load categories.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error('Category name is required.');
    setBusy(true);
    try {
      if (editing) {
        const data = await updateCategory(editing, form);
        toast.success(data.message);
      } else {
        const data = await createCategory(form);
        toast.success(data.message);
      }
      setForm(EMPTY);
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not save the category.');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (category) => {
    setEditing(category._id);
    setForm({
      name: category.name,
      blurb: category.blurb || '',
      image: category.image || '',
      active: category.active !== false,
    });
  };

  const remove = async (category) => {
    if (!window.confirm(`Remove "${category.name}"? Products must be moved first.`)) return;
    try {
      const data = await deleteCategory(category._id);
      toast.success(data.message);
      load();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not delete the category.');
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="rounded-2xl border border-navy/10 bg-surface">
        <div className="flex items-center justify-between border-b border-navy/10 px-5 py-4">
          <div>
            <p className="font-display text-xl text-navy">Shop categories</p>
            <p className="text-[11px] text-ink/40">{categories.length} categories · shown on the storefront filter</p>
          </div>
        </div>

        {loading ? (
          <p className="px-5 py-10 text-sm text-ink/40">Loading…</p>
        ) : (
          <ul className="divide-y divide-navy/5">
            {categories.map((category) => (
              <li key={category._id} className="flex items-center gap-4 px-5 py-3.5">
                <img
                  src={category.image}
                  alt=""
                  className="h-14 w-12 flex-none rounded-lg bg-navy/5 object-cover"
                  onError={(event) => {
                    event.currentTarget.style.visibility = 'hidden';
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-navy">{category.name}</p>
                    {category.active === false && (
                      <span className="badge bg-navy/5 text-ink/50">hidden</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-ink/45">{category.blurb}</p>
                  <p className="mt-0.5 text-[11px] text-ink/35">{category.count} product(s)</p>
                </div>
                <button type="button" onClick={() => startEdit(category)} className="btn-outline btn-sm">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(category)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink/35 transition hover:bg-error/10 hover:text-error"
                  aria-label={`Delete ${category.name}`}
                >
                  <IconTrash size={15} />
                </button>
              </li>
            ))}
            {categories.length === 0 && (
              <li className="px-5 py-10 text-sm text-ink/40">No categories yet — add the first one.</li>
            )}
          </ul>
        )}
      </div>

      <form onSubmit={submit} className="h-fit rounded-2xl border border-navy/10 bg-surface p-5">
        <p className="font-display text-xl text-navy">{editing ? 'Edit category' : 'Add category'}</p>
        <p className="mt-1 text-[11px] text-ink/40">New categories appear in the storefront filter immediately.</p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">Name</span>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="admin-input"
            placeholder="e.g. Nehru Jacket"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">Short line</span>
          <input
            value={form.blurb}
            onChange={(event) => setForm({ ...form, blurb: event.target.value })}
            className="admin-input"
            placeholder="Wedding & sangeet"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">
            Image URL
          </span>
          <input
            value={form.image}
            onChange={(event) => setForm({ ...form, image: event.target.value })}
            className="admin-input"
            placeholder="/images/photos/cloth-3.jpg"
          />
        </label>

        <label className="mt-4 flex items-center gap-2 text-xs text-ink/60">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm({ ...form, active: event.target.checked })}
            className="h-4 w-4 accent-[#C9A84C]"
          />
          Show this category on the website
        </label>

        <button type="submit" disabled={busy} className="btn-navy mt-5 w-full disabled:opacity-60">
          <IconPlus size={14} /> {busy ? 'Saving…' : editing ? 'Save changes' : 'Add category'}
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
            Cancel
          </button>
        )}
      </form>
    </div>
  );
}
