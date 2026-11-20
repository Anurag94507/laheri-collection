import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.jsx';
import usePageMeta from '../hooks/usePageMeta.js';
import { telHref, whatsappHref } from '../components/SendCodeLinks.jsx';
import { toast } from '../store/toast.js';
import { IconArrowRight, IconClock, IconMail, IconMap, IconPhone, IconPin, IconWhatsApp } from '../components/Icons.jsx';

export default function Contact() {
  const { settings } = useSettings();
  const shop = settings?.shop;
  const [form, setForm] = useState({ name: '', phone: '', message: '' });

  usePageMeta({
    title: 'Contact Laheri Collection | Shop Address, Phone & WhatsApp',
    description:
      'Visit Laheri Collection near Dariyapur Chauraha, Sultanpur. Call +91 78005 09636, message us on WhatsApp or send an enquiry about a garment.',
    path: '/contact',
    image: '/images/photos/cloth-9.jpg',
  });

  const address = shop?.address || [shop?.city, shop?.state, shop?.pincode].filter(Boolean).join(', ');
  const mapQuery = encodeURIComponent(address || 'Dariyapur Chauraha, Sultanpur, Uttar Pradesh 228001');
  const waLink = whatsappHref(shop?.whatsapp, 'Hello Laheri Collection! I would like to know more about your collection.');

  const submit = (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const phone = form.phone.trim();
    const message = form.message.trim();
    if (name.length < 2) {
      toast.error('Please share your name.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, '').slice(-10))) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    const plain = `Hello Laheri Collection!\n\nName: ${name}\nMobile: ${phone}\n\n${message || 'I would like to ask about a garment.'}`;
    const number = String(shop?.whatsapp || shop?.phone || '').replace(/\D/g, '').slice(-10);
    window.open(`https://wa.me/91${number}?text=${encodeURIComponent(plain)}`, '_blank', 'noreferrer');
    toast.success('Opening WhatsApp with your message — press send and we will reply.');
    setForm({ name: '', phone: '', message: '' });
  };

  return (
    <div>
      <header className="border-b border-navy/10 bg-paper">
        <div className="container-x py-12 sm:py-16">
          <p className="eyebrow">Contact</p>
          <h1 className="mt-3 font-display text-[42px] leading-[0.98] text-navy sm:text-[56px]">
            Come in, or send us a note
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/60">
            We are at Dariyapur Chauraha in Sultanpur, in front of Vishal Mega Mart. Call, message us on WhatsApp, or
            leave your number and we will call you back about a piece you have seen.
          </p>
        </div>
      </header>

      <section className="container-x grid gap-10 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
        {/* Details */}
        <div>
          <div className="space-y-4">
            <div className="flex gap-4 border-b border-navy/10 pb-4">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gold/20 text-navy">
                <IconPin size={18} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/45">Shop address</p>
                <p className="mt-1 text-sm leading-relaxed text-navy">
                  {address || 'Near Dariyapur Chauraha, In Front of Vishal Mega Mart, Sultanpur, Uttar Pradesh 228001'}
                </p>
                <a
                  href={shop?.mapsLink || `https://maps.google.com/?q=${mapQuery}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark hover:text-navy"
                >
                  Get directions <IconArrowRight size={11} />
                </a>
              </div>
            </div>

            <div className="flex gap-4 border-b border-navy/10 pb-4">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gold/20 text-navy">
                <IconPhone size={17} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/45">Phone &amp; WhatsApp</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-navy">
                  <a href={telHref(shop?.phone)} className="hover:text-gold-dark">{shop?.phone || '+91 7800509636'}</a>
                  <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#128C4A]">
                    <IconWhatsApp size={13} /> WhatsApp
                  </a>
                </p>
              </div>
            </div>

            <div className="flex gap-4 border-b border-navy/10 pb-4">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gold/20 text-navy">
                <IconMail size={17} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/45">Email</p>
                <a href={`mailto:${shop?.email || 'laheri.collection@gmail.com'}`} className="mt-1 block text-sm text-navy hover:text-gold-dark">
                  {shop?.email || 'laheri.collection@gmail.com'}
                </a>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gold/20 text-navy">
                <IconClock size={17} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/45">Opening hours</p>
                <div className="mt-1 space-y-0.5 text-sm text-navy">
                  {(shop?.hours || [
                    { days: 'Monday – Saturday', time: '10:00 AM – 9:00 PM' },
                    { days: 'Sunday', time: '11:00 AM – 7:00 PM' },
                  ]).map((slot) => (
                    <p key={slot.days} className="flex flex-wrap gap-x-2">
                      <span className="text-ink/60">{slot.days}</span>
                      <span>· {slot.time}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <a href={waLink} target="_blank" rel="noreferrer" className="btn-navy btn-sm bg-[#128C4A] hover:bg-[#0F7B6C]">
              <IconWhatsApp size={14} /> Chat on WhatsApp
            </a>
            <a
              href={shop?.mapsLink || `https://maps.google.com/?q=${mapQuery}`}
              target="_blank"
              rel="noreferrer"
              className="btn-outline btn-sm"
            >
              <IconMap size={14} /> Open in Maps
            </a>
          </div>

          <div className="mt-8 overflow-hidden border border-navy/15">
            <iframe
              title={`Google Maps location of ${shop?.name || 'Laheri Collection'}`}
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              width="100%"
              height="320"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block h-[320px] w-full border-0"
            />
          </div>
        </div>

        {/* Form */}
        <div className="border border-navy/12 bg-paper p-6 sm:p-8">
          <p className="eyebrow">Send an enquiry</p>
          <h2 className="mt-2 font-display text-[30px] leading-tight text-navy">Tell us what you are looking for</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/55">
            Share the occasion, size and budget. Your message opens in WhatsApp so it reaches the shop directly.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="contact-name" className="label">Your name</label>
              <input
                id="contact-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="input"
                placeholder="Anurag Sharma"
                autoComplete="name"
                required
              />
            </div>
            <div>
              <label htmlFor="contact-phone" className="label">Mobile number</label>
              <input
                id="contact-phone"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                className="input"
                placeholder="98XXXXXXXX"
                inputMode="numeric"
                autoComplete="tel"
                required
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="label">What are you looking for?</label>
              <textarea
                id="contact-message"
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                rows="4"
                className="input resize-none"
                placeholder="A sherwani for a December wedding, size L, budget around ₹5,000…"
              />
            </div>
            <button type="submit" className="btn-gold w-full">
              <IconWhatsApp size={15} /> Send on WhatsApp
            </button>
            <p className="text-center text-[11px] text-ink/40">
              Prefer to browse first? <Link to="/collections" className="font-semibold text-navy underline underline-offset-2">See the collection</Link>
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
