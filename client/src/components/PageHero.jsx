export default function PageHero({ eyebrow, title, description, children, compact = false }) {
  return (
    <section className="relative overflow-hidden bg-navy text-surface">
      <div
        className="absolute inset-0 opacity-25"
        style={{ backgroundImage: 'url(/images/hero.svg)', backgroundSize: 'cover', backgroundPosition: 'center 30%' }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/92 to-navy/55" />
      <div className={`container-x relative ${compact ? 'py-10 sm:py-12' : 'py-14 sm:py-20'}`}>
        <div className="max-w-2xl">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className={`mt-2 ${compact ? 'text-[32px] sm:text-[38px]' : 'text-[38px] leading-[1.02] sm:text-[52px]'} text-surface`}>{title}</h1>
          {description && <p className="mt-4 max-w-xl text-sm leading-relaxed text-parchment/65">{description}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
