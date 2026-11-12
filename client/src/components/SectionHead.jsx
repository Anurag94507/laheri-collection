export default function SectionHead({ eyebrow, title, description, align = 'left', action }) {
  const centered = align === 'center';
  return (
    <div className={`mb-10 flex flex-col gap-4 ${centered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between'}`}>
      <div className={centered ? 'max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-2 text-[34px] leading-[1.05] sm:text-[40px]">{title}</h2>
        {description && <p className="mt-3 text-sm leading-relaxed text-ink/55">{description}</p>}
      </div>
      {action}
    </div>
  );
}
