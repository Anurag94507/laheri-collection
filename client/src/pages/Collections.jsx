import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts } from '../api/index.js';
import ProductCard from '../components/ProductCard.jsx';
import ClothingRack from '../components/ClothingRack.jsx';
import QuickView from '../components/QuickView.jsx';
import Modal from '../components/Modal.jsx';
import usePageMeta from '../hooks/usePageMeta.js';
import { useCart } from '../store/cart.js';
import { toast } from '../store/toast.js';
import { GENDERS, productOccasions, matchesFacets } from '../utils/facets.js';
import { discountPercent, formatINR } from '../utils/format.js';
import { garmentImage } from '../data/garments.js';
import { IconClose, IconFilter, IconGrid, IconSearch } from '../components/Icons.jsx';

const PRICE_RANGES = [
  { label: 'Under ₹1,000', value: '0-1000' },
  { label: '₹1,000 – ₹2,500', value: '1000-2500' },
  { label: '₹2,500 – ₹5,000', value: '2500-5000' },
  { label: '₹5,000 and above', value: '5000-100000' },
];

const OCCASIONS = ['Wedding', 'Festive', 'Formal', 'Casual', 'Everyday'];

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
  { value: 'bestselling', label: 'Bestselling' },
  { value: 'discount', label: 'Discount' },
];

const EMPTY_FACETS = { categories: [], fabrics: [], colors: [], sizes: [] };

export default function Collections() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ items: [], facets: EMPTY_FACETS, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState(params.get('q') || '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compare, setCompare] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('grid');
  const addItem = useCart((state) => state.addItem);

  usePageMeta({
    title: 'Shop Ethnic, Formal & Festive Wear | Laheri Collection',
    description:
      'Browse kurtas, sherwanis, formal shirts, casual and festive wear at Laheri Collection, Sultanpur. Filter by category, gender, occasion and price.',
    path: '/collections',
    image: '/images/photos/cloth-5.jpg',
  });

  const category = params.get('category') || 'All';
  const price = params.get('price') || '';
  const size = params.get('size') || '';
  const fabric = params.get('fabric') || '';
  const color = params.get('color') || '';
  const gender = params.get('gender') || '';
  const occasion = params.get('occasion') || '';
  const sort = params.get('sort') || 'newest';
  const q = params.get('q') || '';

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'All') next.delete(key);
    else next.set(key, value);
    next.delete('page');
    setParams(next);
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const [minPrice, maxPrice] = price ? price.split('-') : [];
    getProducts({
      category: category !== 'All' ? category : undefined,
      q: q || undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      size: size || undefined,
      fabric: fabric || undefined,
      color: color || undefined,
      sort,
      limit: 60,
    })
      .then((response) => alive && setData({ ...response, facets: { ...EMPTY_FACETS, ...response.facets } }))
      .catch(() => alive && toast.error('Could not load the collection.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [category, price, size, fabric, color, sort, q]);

  // Gender and occasion are derived from each piece, so they are applied here
  // instead of on the server — the catalogue has no separate columns for them.
  const items = useMemo(
    () => data.items.filter((product) => matchesFacets(product, { gender, occasion })),
    [data.items, gender, occasion]
  );

  const occasionCounts = useMemo(() => {
    const counts = {};
    data.items.forEach((product) => {
      productOccasions(product).forEach((name) => {
        counts[name] = (counts[name] || 0) + 1;
      });
    });
    return counts;
  }, [data.items]);

  const activeFilters = useMemo(
    () =>
      [
        category !== 'All' && { key: 'category', label: category },
        gender && { key: 'gender', label: gender },
        occasion && { key: 'occasion', label: occasion },
        price && { key: 'price', label: PRICE_RANGES.find((range) => range.value === price)?.label || 'Price' },
        size && { key: 'size', label: `Size ${size}` },
        fabric && { key: 'fabric', label: fabric },
        color && { key: 'color', label: color },
        q && { key: 'q', label: `“${q}”` },
      ].filter(Boolean),
    [category, gender, occasion, price, size, fabric, color, q]
  );

  const clearAll = () => {
    setParams(new URLSearchParams());
    setSearchText('');
  };

  const toggleCompare = (product) => {
    setCompare((current) => {
      if (current.some((entry) => entry._id === product._id)) return current.filter((entry) => entry._id !== product._id);
      if (current.length >= 2) {
        toast.info('You can compare two products at a time.');
        return [current[1], product];
      }
      return [...current, product];
    });
  };

  const filterContent = (
    <div className="space-y-7">
      <div>
        <p className="label">Category</p>
        <div className="space-y-1.5">
          {['All', ...data.facets.categories, 'Sale'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => update('category', option)}
              className={`block w-full text-left text-sm transition ${
                category === option ? 'font-semibold text-navy' : 'text-ink/55 hover:text-navy'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Gender</p>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => update('gender', gender === option ? '' : option)}
              className={`chip ${gender === option ? 'chip-active' : ''}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Occasion</p>
        <div className="flex flex-wrap gap-2">
          {OCCASIONS.filter((option) => occasionCounts[option] || occasion === option).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => update('occasion', occasion === option ? '' : option)}
              className={`chip ${occasion === option ? 'chip-active' : ''}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Price range</p>
        <div className="space-y-2">
          {PRICE_RANGES.map((range) => (
            <label key={range.value} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink/60">
              <input
                type="radio"
                name="price"
                checked={price === range.value}
                onChange={() => update('price', price === range.value ? '' : range.value)}
                className="h-3.5 w-3.5 accent-[#9C7C42]"
              />
              {range.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Size</p>
        <div className="flex flex-wrap gap-2">
          {data.facets.sizes.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => update('size', size === option ? '' : option)}
              className={`chip ${size === option ? 'chip-active' : ''}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Fabric</p>
        <select value={fabric} onChange={(event) => update('fabric', event.target.value)} className="input py-2.5 text-sm">
          <option value="">All fabrics</option>
          {data.facets.fabrics.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="label">Colour</p>
        <div className="flex flex-wrap gap-2">
          {data.facets.colors.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => update('color', color === option ? '' : option)}
              className={`chip ${color.toLowerCase() === option.toLowerCase() ? 'chip-active' : ''}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={clearAll} className="text-xs font-medium text-ink/45 underline underline-offset-4 hover:text-navy">
        Clear all filters
      </button>
    </div>
  );

  return (
    <div>
      <header className="border-b border-navy/10 bg-paper">
        <div className="container-x py-10 sm:py-14">
          <p className="eyebrow">The shop</p>
          <div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <h1 className="font-display text-[42px] leading-[0.98] text-navy sm:text-[56px]">
                {category === 'All' ? 'Every occasion, one shop' : category}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-ink/60">
                Kurtas for the pooja, sherwanis for the wedding, shirts for the office and easy pieces for the
                weekend. Filter by occasion, gender, fabric or budget.
              </p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                update('q', searchText.trim());
              }}
              className="flex w-full max-w-sm items-center gap-2 rounded-full border border-navy/20 bg-white p-1.5"
            >
              <IconSearch size={16} className="ml-2.5 flex-none text-navy/40" />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search kurtas, sherwanis, cotton…"
                className="min-w-0 flex-1 bg-transparent px-1 text-sm text-navy outline-none placeholder:text-ink/35"
                aria-label="Search products"
              />
              <button type="submit" className="btn-gold btn-sm">Search</button>
            </form>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {['All', ...data.facets.categories].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  update('category', option);
                  setSearchText('');
                }}
                className={`rounded-full border px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                  category === option
                    ? 'border-navy bg-navy text-cream'
                    : 'border-navy/15 text-navy/60 hover:border-navy hover:text-navy'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="container-x grid gap-10 py-10 lg:grid-cols-[230px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-28">{filterContent}</div>
        </aside>

        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink/50">
              <span className="font-semibold text-navy">{items.length}</span> pieces
              {loading ? ' · loading…' : ''}
            </p>
            <div className="flex items-center gap-2">
              <div className="hidden items-center rounded-full border border-navy/15 p-0.5 sm:flex">
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] ${view === 'grid' ? 'bg-navy text-cream' : 'text-navy/55'}`}
                >
                  <IconGrid size={12} /> Grid
                </button>
                <button
                  type="button"
                  onClick={() => setView('rail')}
                  className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] ${view === 'rail' ? 'bg-navy text-cream' : 'text-navy/55'}`}
                >
                  Rail
                </button>
              </div>
              <button type="button" onClick={() => setFiltersOpen(true)} className="btn-outline btn-sm lg:hidden">
                <IconFilter size={13} /> Filters
              </button>
              <select value={sort} onChange={(event) => update('sort', event.target.value)} className="admin-input w-auto py-2 text-xs">
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {activeFilters.map((filter) => (
                <button key={filter.key} type="button" onClick={() => update(filter.key, '')} className="chip chip-active">
                  {filter.label} <IconClose size={11} />
                </button>
              ))}
              <button type="button" onClick={clearAll} className="ml-1 text-[11px] text-ink/40 underline underline-offset-4 hover:text-navy">
                Clear
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="aspect-[3/4] animate-pulse bg-navy/5" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="border border-dashed border-navy/20 px-6 py-20 text-center">
              <p className="font-display text-3xl text-navy">Nothing on this rail yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-ink/50">
                {gender === 'Women' || gender === 'Kids'
                  ? `Our ${gender.toLowerCase()}'s rack is being restocked. Reset the filter, or message us on WhatsApp and we will tell you what has arrived.`
                  : 'Try widening the filters — or call the shop, we may have something in the back.'}
              </p>
              <button type="button" onClick={clearAll} className="btn-navy btn-sm mt-6">Reset filters</button>
            </div>
          ) : view === 'rail' ? (
            <div className="-mx-5 sm:mx-0">
              <ClothingRack products={items} onSelect={setSelected} ariaLabel={`${category} rail`} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-5">
              {items.map((product, index) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  index={index}
                  onQuickView={setSelected}
                  showCompare
                  onCompare={toggleCompare}
                  compared={compare.some((entry) => entry._id === product._id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[85] bg-navy/50 lg:hidden" onClick={() => setFiltersOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-surface p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <p className="font-display text-2xl">Filters</p>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-navy/15"
                aria-label="Close filters"
              >
                <IconClose size={17} />
              </button>
            </div>
            {filterContent}
            <button type="button" onClick={() => setFiltersOpen(false)} className="btn-navy mt-6 w-full">
              Show {items.length} pieces
            </button>
          </div>
        </div>
      )}

      {compare.length > 0 && (
        <div className="fixed inset-x-3 bottom-40 z-[55] mx-auto flex max-w-2xl items-center gap-3 rounded-full border border-navy/15 bg-cream p-2 pl-3 shadow-lift md:bottom-8">
          <div className="flex flex-1 gap-2 overflow-x-auto">
            {compare.map((product) => (
              <div key={product._id} className="flex items-center gap-2">
                <img src={garmentImage(product)} alt="" className="h-9 w-7 object-cover" />
                <div className="max-w-[110px]">
                  <p className="truncate text-[11px] font-medium text-navy">{product.name}</p>
                  <button
                    type="button"
                    onClick={() => toggleCompare(product)}
                    className="text-[9px] uppercase tracking-wide text-ink/40 hover:text-navy"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            disabled={compare.length < 2}
            className="btn-navy btn-sm flex-none disabled:opacity-40"
          >
            Compare
          </button>
        </div>
      )}

      <Modal open={compareOpen} onClose={() => setCompareOpen(false)} title="Side by side" size="xl">
        <div className="grid gap-6 sm:grid-cols-2">
          {compare.map((product) => (
            <div key={product._id}>
              <div className="overflow-hidden bg-surface">
                <img src={garmentImage(product)} alt={`${product.name} — ${product.fabric} ${product.category}`} className="aspect-[4/3] w-full object-cover" />
              </div>
              <h3 className="mt-3 font-display text-2xl">{product.name}</h3>
              <p className="mt-1 text-sm text-ink/50">{product.fabric} · {product.category}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="font-medium text-navy">{formatINR(product.effectivePrice)}</span>
                {discountPercent(product) > 0 && (
                  <>
                    <span className="text-xs text-ink/35 line-through">{formatINR(product.price)}</span>
                    <span className="badge bg-gold/25 text-navy">{discountPercent(product)}% off</span>
                  </>
                )}
              </div>
              <dl className="mt-4 space-y-2 border-t border-navy/10 pt-3 text-xs">
                {[
                  ['Sizes', (product.sizes || []).join(', ')],
                  ['Colours', (product.colors || []).join(', ')],
                  ['In stock', `${product.stock} units`],
                  ['Rating', `${product.rating} / 5 (${product.reviewCount} reviews)`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-ink/45">{label}</dt>
                    <dd className="text-right font-medium text-navy/80">{value}</dd>
                  </div>
                ))}
              </dl>
              <button
                type="button"
                onClick={() => addItem(product, product.sizes?.[0] || 'Free Size', 1)}
                className="btn-navy btn-sm mt-4 w-full"
              >
                Add size {product.sizes?.[0] || 'Free'} to bag
              </button>
            </div>
          ))}
        </div>
      </Modal>

      <QuickView product={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
