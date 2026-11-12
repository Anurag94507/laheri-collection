import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import ChatPanel from './ChatPanel.jsx';
import { useChat } from '../store/chat.js';
import { IconChat, IconClose, IconSparkles } from './Icons.jsx';

export default function ChatWidget() {
  const { open, openChat, closeChat } = useChat();
  const location = useLocation();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') closeChat();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeChat]);

  if (location.pathname.startsWith('/chatbot')) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-x-3 bottom-24 top-20 z-[75] flex flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-lift md:inset-auto md:bottom-24 md:right-6 md:h-[600px] md:w-[400px]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-navy/10 bg-white px-4 py-2.5">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-navy/55">
                <IconSparkles size={14} className="text-gold" /> Shop assistant
              </p>
              <div className="flex items-center gap-2">
                <Link to="/chatbot" onClick={closeChat} className="text-[11px] font-medium text-navy/50 underline decoration-gold/50 underline-offset-2 hover:text-navy">
                  Full screen
                </Link>
                <button type="button" onClick={closeChat} className="flex h-7 w-7 items-center justify-center rounded-full text-navy/50 transition hover:bg-navy/5 hover:text-navy" aria-label="Close assistant">
                  <IconClose size={16} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <ChatPanel compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <button
          type="button"
          onClick={openChat}
          className="group fixed bottom-24 right-5 z-[60] flex h-14 items-center gap-2 rounded-full bg-navy px-4 text-surface shadow-lift transition hover:bg-navy-800 md:bottom-6 md:right-6"
          aria-label="Ask our AI shop assistant"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gold text-navy">
            <IconChat size={17} />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse-soft rounded-full border-2 border-navy bg-success" />
          </span>
          <span className="hidden text-xs font-medium tracking-wide sm:block">Ask Raja</span>
        </button>
      )}
    </>
  );
}
