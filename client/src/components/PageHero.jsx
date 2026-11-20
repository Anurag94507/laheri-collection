export default function PageHero({ eyebrow, title, description, children, compact = false }) {
  return (
    <section className="relative overflow-hidden border-b border-navy/10 bg-navy text-cream">
      <div
        className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full border border-cream/10"
        aria-hidden="true"
      />
      <div className={`container-x relative ${compact ? 'py-10 sm:py-12' : 'py-14 sm:py-20'}`}>
        <div className="max-w-2xl">
          {eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-cream/45">{eyebrow}</p>}
          <h1 className={`mt-2 font-display ${compact ? 'text-[34px] sm:text-[42px]' : 'text-[40px] leading-[1.02] sm:text-[56px]'} text-cream`}>{title}</h1>
          {description && <p className="mt-4 max-w-xl text-sm leading-relaxed text-cream/60">{description}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
