import { useEffect } from 'react';
import { IconClose } from './Icons.jsx';

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export default function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', bodyClassName = '' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-navy/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className={`flex max-h-[92vh] w-full ${sizes[size] || sizes.md} flex-col overflow-hidden rounded-2xl bg-white shadow-lift`}>
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-navy/10 px-5 py-4">
            <div>
              {title && <h3 className="font-display text-2xl leading-tight">{title}</h3>}
              {subtitle && <p className="mt-1 text-xs text-ink/50">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-navy/10 text-navy/50 transition hover:border-navy/30 hover:text-navy"
              aria-label="Close dialog"
            >
              <IconClose size={16} />
            </button>
          </div>
        )}
        <div className={`min-h-0 flex-1 overflow-y-auto px-5 py-5 ${bodyClassName}`}>{children}</div>
        {footer && <div className="border-t border-navy/10 bg-surface/60 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
