import { IconPhone, IconWhatsApp } from './Icons.jsx';

const digits = (raw) => String(raw || '').replace(/\D/g, '').slice(-10);

export const whatsappHref = (mobile, message) =>
  `https://wa.me/91${digits(mobile)}?text=${encodeURIComponent(message)}`;

export const telHref = (mobile) => `tel:+91${digits(mobile)}`;

export const smsHref = (mobile, message) =>
  `sms:+91${digits(mobile)}?body=${encodeURIComponent(message)}`;

export function otpMessage({ name, code, purpose = 'login' }) {
  const firstName = String(name || '').trim().split(/\s+/)[0];
  const who = firstName ? `${firstName}, ` : '';
  const what = purpose === 'reset' ? 'password reset code' : 'login code';
  return `Namaste ${who}your Laheri Collection ${what} is ${code}. It expires in 5 minutes. — Laheri Collection, Sultanpur`;
}

/**
 * Opens the shop's own WhatsApp or SMS app with the message ready to send.
 * Nothing is sent by the server, so no SMS/WhatsApp provider is needed.
 */
export default function SendCodeLinks({ mobile, code = '', name = '', purpose = 'login', className = '' }) {
  const number = digits(mobile);
  if (number.length !== 10) return null;

  const firstName = String(name || '').trim().split(/\s+/)[0];
  const message = code
    ? otpMessage({ name, code, purpose })
    : `Namaste${firstName ? ` ${firstName}` : ''}! This is Laheri Collection, Sultanpur. How can we help you today?`;

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      <a
        href={whatsappHref(number, message)}
        target="_blank"
        rel="noreferrer"
        title={`Send on WhatsApp to ${number}`}
        className="inline-flex items-center gap-1 rounded-full border border-[#25D366]/40 bg-[#25D366]/10 px-2.5 py-1 text-[10px] font-semibold text-[#0F7B6C] transition hover:bg-[#25D366]/25"
      >
        <IconWhatsApp size={12} /> WhatsApp
      </a>
      <a
        href={smsHref(number, message)}
        title={`Send on SMS to ${number}`}
        className="inline-flex items-center gap-1 rounded-full border border-navy/15 bg-navy/5 px-2.5 py-1 text-[10px] font-semibold text-navy/70 transition hover:bg-navy/10"
      >
        <IconPhone size={12} /> SMS
      </a>
    </span>
  );
}
