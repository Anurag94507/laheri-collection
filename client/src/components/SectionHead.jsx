export default function SectionHead({ eyebrow, title, description, align = 'left', action }) {
  const centered = align === 'center';
  return (
    <div
      className={`mb-9 flex flex-col gap-4 ${
        centered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between'
      }`}
    >
      <div className="max-w-2xl">
        {eyebrow && <p className={centered ? 'eyebrow' : 'eyebrow-line'}>{eyebrow}</p>}
        <h2 className="mt-2.5 display-lg">{title}</h2>
        {description && (
          <p className={`mt-3 max-w-xl text-[13px] leading-relaxed text-ink/55 ${centered ? 'mx-auto' : ''}`}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
