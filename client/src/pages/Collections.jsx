import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProducts } from '../api/index.js';
import ProductCard from '../components/ProductCard.jsx';
import PageHero from '../components/PageHero.jsx';
import Modal from '../components/Modal.jsx';
import { useCart } from '../store/cart.js';
import { toast } from '../store/toast.js';
import { discountPercent, formatINR } from '../utils/format.js';
import { IconClose, IconFilter, IconSearch, IconStar } from '../components/Icons.jsx';

const PRICE_RANGES = [
  { label: 'Under ₹1,000', value: '0-1000' },
  { label: '₹1,000 – ₹2,500', value: '1000-2500' },
  { label: '₹2,500 – ₹5,000', value: '2500-5000' },
  { label: '₹5,000 and above', value: '5000-100000' },
];

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'bestselling', label: 'Bestselling' },
  { value: 'discount', label: 'Biggest discount' },
];

export default function Collections() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ items: [], facets: { categories: [], fabrics: [], colors: [], sizes: [] }, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState(params.get('q') || '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compare, setCompare] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const addItem = useCart((state) => state.addItem);

  const category = params.get('category') || 'All';
  const price = params.get('price') || '';
  const size = params.get('size') || '';
  const fabric = params.get('fabric') || '';
  const color = params.get('color') || '';
  const sort = params.get('sort') || 'newest';
  const page = Number(params.get('page') || 1);
  const q = params.get('q') || '';

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'All') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
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
      page,
      limit: 9,
    })
      .then((response) => alive && setData(response))
      .catch(() => alive && toast.error('Could not load the collection.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [category, price, size, fabric, color, sort, page, q]);

  const activeFilters = useMemo(
    () =>
      [
        category !== 'All' && { key: 'category', label: category },
        price && { key: 'price', label: PRICE_RANGES.find((range) => range.value === price)?.label || 'Price' },
        size && { key: 'size', label: `Size ${size}` },
        fabric && { key: 'fabric', label: fabric },
        color && { key: 'color', label: color },
        q && { key: 'q', label: `“${q}”` },
      ].filter(Boolean),
    [category, price, size, fabric, color, q]
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
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">Category</p>
        <div className="space-y-1.5">
          {['All', ...data.facets.categories, 'Sale'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => update('category', option)}
              className={`block w-full text-left text-sm transition ${category === option ? 'font-semibold text-gold-dark' : 'text-ink/60 hover:text-navy'}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">Price</p>
        <div className="space-y-2">
          {PRICE_RANGES.map((range) => (
            <label key={range.value} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink/65">
              <input
                type="radio"
                name="price"
                checked={price === range.value}
                onChange={() => update('price', price === range.value ? '' : range.value)}
                className="h-3.5 w-3.5 accent-[#C9A84C]"
              />
              {range.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">Size</p>
        <div className="flex flex-wrap gap-2">
          {data.facets.sizes.map((option) => (
            <button key={option} type="button" onClick={() => update('size', size === option ? '' : option)} className={`chip ${size === option ? 'chip-active' : ''}`}>
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">Fabric</p>
        <select value={fabric} onChange={(event) => update('fabric', event.target.value)} className="input py-2.5 text-sm">
          <option value="">All fabrics</option>
          {data.facets.fabrics.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">Colour</p>
        <div className="flex flex-wrap gap-2">
          {data.facets.colors.map((option) => (
            <button key={option} type="button" onClick={() => update('color', color === option ? '' : option)} className={`chip ${color.toLowerCase() === option.toLowerCase() ? 'chip-active' : ''}`}>
              {option}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={clearAll} className="text-xs font-medium text-ink/45 underline underline-offset-4 hover:text-error">
        Clear all filters
      </button>
    </div>
  );

  return (
    <div>
      <PageHero
        eyebrow="The collection"
        title={category === 'All' ? 'Every piece, one place' : category}
        description="Hand-picked menswear stocked at our Sultanpur shop. Search or filter by category, fabric, size and budget — then try it on in store or order online."
        compact
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            update('q', searchText.trim());
          }}
          className="mt-6 flex max-w-xl items-center gap-2 rounded-full border border-parchment/20 bg-navy/60 p-1.5 backdrop-blur"
        >
          <IconSearch size={17} className="ml-3 flex-none text-parchment/50" />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search kurtas, sherwanis, cotton…"
            className="min-w-0 flex-1 bg-transparent px-1 text-sm text-surface outline-none placeholder:text-parchment/40"
            aria-label="Search products"
          />
          <button type="submit" className="btn-gold btn-sm">Search</button>
        </form>

        <div className="mt-5 flex flex-wrap gap-2">
          {['All', ...data.facets.categories].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                update('category', option);
                setSearchText('');
              }}
              className={`rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition ${
                (option === 'All' ? category === 'All' : category === option)
                  ? 'border-gold bg-gold text-navy'
                  : 'border-parchment/25 text-parchment/70 hover:border-gold hover:text-gold'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </PageHero>

      <div className="container-x grid gap-10 py-12 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-28">{filterContent}</div>
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink/50">
              <span className="font-semibold text-navy">{data.total || 0}</span> pieces
              {loading ? ' · loading…' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setFiltersOpen(true)} className="btn-outline btn-sm lg:hidden">
                <IconFilter size={14} /> Filters
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
                  {filter.label} <IconClose size={12} />
                </button>
              ))}
              <button type="button" onClick={clearAll} className="ml-1 text-[11px] text-ink/40 underline underline-offset-4 hover:text-error">
                Clear
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index}>
                  <div className="aspect-[4/5] animate-pulse rounded-2xl bg-navy/5" />
                  <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-navy/5" />
                  <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-navy/5" />
                </div>
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-navy/15 bg-white/60 px-6 py-20 text-center">
              <p className="font-display text-3xl text-navy">Nothing matches yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-ink/50">
                Try widening your filters — or call the shop, we may have something in the back.
              </p>
              <button type="button" onClick={clearAll} className="btn-navy btn-sm mt-6">Reset filters</button>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3">
              {data.items.map((product, index) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  index={index}
                  showCompare
                  onCompare={toggleCompare}
                  compared={compare.some((entry) => entry._id === product._id)}
                />
              ))}
            </motion.div>
          )}

          {data.pages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              {Array.from({ length: data.pages }).map((_, index) => {
                const pageNumber = index + 1;
                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => update('page', String(pageNumber))}
                    className={`h-9 min-w-[36px] rounded-full px-3 text-xs font-medium transition ${
                      pageNumber === page ? 'bg-navy text-surface' : 'border border-navy/15 text-navy/60 hover:border-gold'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[85] bg-navy/50 lg:hidden" onClick={() => setFiltersOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-surface p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <p className="font-display text-2xl">Filters</p>
              <button type="button" onClick={() => setFiltersOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-navy/15" aria-label="Close filters">
                <IconClose size={18} />
              </button>
            </div>
            {filterContent}
            <button type="button" onClick={() => setFiltersOpen(false)} className="btn-navy mt-6 w-full">Show {data.total} pieces</button>
          </div>
        </div>
      )}

      {/* Compare tray */}
      {compare.length > 0 && (
        <div className="fixed inset-x-3 bottom-24 z-[55] mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-gold/40 bg-navy p-3 text-surface shadow-lift md:bottom-6">
          <div className="flex flex-1 gap-2 overflow-x-auto">
            {compare.map((product) => (
              <div key={product._id} className="flex items-center gap-2 rounded-lg bg-white/10 p-1.5 pr-2">
                <img src={product.images?.[0]} alt="" className="h-10 w-8 rounded object-cover" />
                <div className="max-w-[120px]">
                  <p className="truncate text-[11px] font-medium">{product.name}</p>
                  <button type="button" onClick={() => toggleCompare(product)} className="text-[9px] uppercase tracking-wide text-parchment/50 hover:text-gold">Remove</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setCompareOpen(true)} disabled={compare.length < 2} className="btn-gold btn-sm flex-none disabled:opacity-40">
            Compare
          </button>
        </div>
      )}

      <Modal open={compareOpen} onClose={() => setCompareOpen(false)} title="Side by side" size="xl">
        <div className="grid gap-6 sm:grid-cols-2">
          {compare.map((product) => (
            <div key={product._id}>
              <div className="overflow-hidden rounded-xl bg-surface">
                <img src={product.images?.[0]} alt={product.name} className="aspect-[4/3] w-full object-cover" />
              </div>
              <h3 className="mt-3 font-display text-2xl">{product.name}</h3>
              <p className="mt-1 text-sm text-ink/50">{product.fabric} · {product.category}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="font-semibold text-navy">{formatINR(product.effectivePrice)}</span>
                {discountPercent(product) > 0 && (
                  <>
                    <span className="text-xs text-ink/35 line-through">{formatINR(product.price)}</span>
                    <span className="badge bg-error/10 text-error">{discountPercent(product)}% off</span>
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
    </div>
  );
}
