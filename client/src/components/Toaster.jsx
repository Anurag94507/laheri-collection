import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '../store/toast.js';
import { IconCheck, IconClose } from './Icons.jsx';

export default function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6">
      <AnimatePresence>
        {toasts.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-lift ${
              item.type === 'error'
                ? 'bg-error text-white'
                : item.type === 'info'
                  ? 'bg-navy text-surface'
                  : 'bg-navy text-surface'
            }`}
          >
            <span className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full ${item.type === 'error' ? 'bg-white/15' : 'bg-gold text-navy'}`}>
              {item.type === 'error' ? '!' : <IconCheck size={13} strokeWidth={2.5} />}
            </span>
            <p className="flex-1 leading-snug">{item.message}</p>
            <button type="button" onClick={() => dismiss(item.id)} className="mt-0.5 text-current/60 transition hover:text-current" aria-label="Dismiss">
              <IconClose size={15} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
