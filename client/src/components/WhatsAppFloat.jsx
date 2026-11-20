import { useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.jsx';
import { whatsappHref } from './SendCodeLinks.jsx';
import { IconWhatsApp } from './Icons.jsx';

export default function WhatsAppFloat() {
  const { settings } = useSettings();
  const { pathname } = useLocation();
  // Contact carries its own WhatsApp actions right beside the form, so the
  // float would sit on top of the send button there.
  if (pathname.startsWith('/admin') || pathname === '/contact') return null;

  const number = settings?.shop?.whatsapp;
  if (!number) return null;

  const href = whatsappHref(number, 'Hello Laheri Collection! I would like to know more about your collection.');

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-6 right-6 z-[65] hidden items-center gap-2 border border-ink/15 bg-cream py-3 pl-3 pr-4 text-ink shadow-lift transition hover:border-ink md:flex"
    >
      <IconWhatsApp size={20} className="text-[#128C4A]" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">WhatsApp</span>
    </a>
  );
}
