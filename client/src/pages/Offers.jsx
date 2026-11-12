import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts } from '../api/index.js';
import PageHero from '../components/PageHero.jsx';
import ProductCard from '../components/ProductCard.jsx';
import SectionHead from '../components/SectionHead.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { toast } from '../store/toast.js';
import { IconCopy, IconGift, IconPercent, IconPuzzle, IconSparkles } from '../components/Icons.jsx';

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Copied ${text}`);
  } catch {
    toast.error('Could not copy — please type the code at checkout.');
  }
};

export default function Offers() {
  const { settings } = useSettings();
  const [saleItems, setSaleItems] = useState([]);
  const offers = settings?.offers;

  useEffect(() => {
    getProducts({ sale: 'true', limit: 8, sort: 'discount' })
      .then((data) => setSaleItems(data.items || []))
      .catch(() => {});
  }, []);

  return (
    <div>
      <PageHero
        eyebrow="Offers & festivals"
        title="A little extra for the occasion"
        description="Festival discounts, game coupons and end-of-season prices. Coupons are single-use and linked to your mobile number."
        compact
      />

      <div className="container-x py-12">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="relative overflow-hidden rounded-3xl bg-navy p-8 text-surface sm:p-10">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border-[22px] border-gold/15" />
            <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full border-[16px] border-parchment/10" />
            <div className="relative">
              <p className="eyebrow">{offers?.festival || 'Festive season'}</p>
              <h2 className="mt-3 max-w-md font-display text-[36px] leading-[1.02] text-surface sm:text-[44px]">
                {offers?.title || 'Festive collection is live'}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-parchment/65">
                {offers?.subtitle || 'Flat discounts across the festive rack while stocks last.'}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 rounded-full border border-dashed border-gold/60 px-4 py-2.5">
                  <span className="font-mono text-sm tracking-[0.2em] text-gold">{offers?.code || 'FESTIVE20'}</span>
                  <button type="button" onClick={() => copyText(offers?.code || 'FESTIVE20')} className="text-gold/70 transition hover:text-gold" aria-label="Copy coupon code">
                    <IconCopy size={15} />
                  </button>
                </div>
                <Link to="/collections?category=Festive%20Special" className="btn-gold btn-sm">Shop festive</Link>
              </div>

              <div className="mt-8 grid gap-3 border-t border-parchment/15 pt-5 text-[11px] text-parchment/55 sm:grid-cols-3">
                <p>Valid on kurtas and festive sets</p>
                <p>Single use per customer</p>
                <p>Exchange within 7 days</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-navy/10 bg-white p-6 sm:p-8">
            <p className="eyebrow">Game coupons</p>
            <h2 className="mt-2 font-display text-[28px] leading-tight">Play once, save instantly</h2>
            <div className="mt-5 space-y-3">
              <Link to="/spin-wheel" className="group flex items-center gap-3 rounded-xl border border-navy/10 p-3.5 transition hover:border-gold">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gold/15 text-gold-dark">
                  <IconGift size={18} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-navy">Spin the Wheel</span>
                  <span className="block text-[11px] text-ink/45">Up to 30% off · once a week</span>
                </span>
                <span className="text-[10px] uppercase tracking-wide text-gold-dark">Play</span>
              </Link>
              <Link to="/puzzle" className="group flex items-center gap-3 rounded-xl border border-navy/10 p-3.5 transition hover:border-gold">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-navy/5 text-navy">
                  <IconPuzzle size={18} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-navy">Fabric Puzzle</span>
                  <span className="block text-[11px] text-ink/45">Flat 12% off · solve in 2 minutes</span>
                </span>
                <span className="text-[10px] uppercase tracking-wide text-gold-dark">Play</span>
              </Link>
            </div>
            <div className="mt-5 rounded-xl bg-surface p-4 text-[11px] leading-relaxed text-ink/50">
              <p className="font-semibold text-navy/70">How to redeem</p>
              <p className="mt-1">Copy the coupon code you win, add your pieces to the bag and paste it on the cart page. One code per order.</p>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { icon: IconPercent, title: 'Festival pricing', text: 'The festive rack is marked down directly on the product page — no code needed.' },
            { icon: IconGift, title: 'Free alteration', text: 'Every purchase includes free alteration within 3 days at the shop.' },
            { icon: IconSparkles, title: 'First pick', text: 'Game players get early word on new arrivals through WhatsApp.' },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-navy/10 bg-white p-5">
              <item.icon size={20} className="text-gold-dark" />
              <p className="mt-3 font-display text-xl text-navy">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink/50">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <SectionHead
            eyebrow="Marked down"
            title="On sale right now"
            description="Last pieces and seasonal markdowns. Sale items are final sale — exchange is not available."
            action={
              <Link to="/collections?sale=1" className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-navy/55 hover:text-gold-dark sm:block">
                View all
              </Link>
            }
          />
          {saleItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-navy/15 bg-white/60 p-10 text-center text-sm text-ink/45">
              No markdowns running this minute — check back after the next festival.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
              {saleItems.map((product, index) => (
                <ProductCard key={product._id} product={product} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
