import PageHero from '../components/PageHero.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { IconClock, IconMic, IconPhone, IconVolume } from '../components/Icons.jsx';

export default function ChatbotPage() {
  const { settings } = useSettings();
  const shop = settings?.shop;

  return (
    <div>
      <PageHero
        eyebrow="Shop assistant"
        title="Ask Raja anything"
        description="Our AI shop assistant knows the collections, the offers, the timings and the alteration policy. Type or speak — it replies in seconds, in English or Hinglish."
        compact
      />

      <div className="container-x grid gap-8 py-12 lg:grid-cols-[1.5fr_0.8fr] lg:items-start">
        <div className="h-[68vh] min-h-[480px]">
          <ChatPanel />
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-navy/10 bg-white p-5">
            <p className="eyebrow">What it can do</p>
            <ul className="mt-3 space-y-2.5 text-xs text-ink/55">
              {[
                'Suggest an outfit for the occasion',
                'Explain fabric and fit',
                'Share store timings and directions',
                'Explain offers and game coupons',
                'Guide you through ordering and tracking',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-gold" /> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-navy/10 bg-white p-5 text-xs text-ink/55">
            <p className="flex items-center gap-2 font-medium text-navy"><IconMic size={15} className="text-gold-dark" /> Speak instead of typing</p>
            <p className="mt-1.5 leading-relaxed">Tap the microphone and ask your question. Chrome and Edge support voice input best.</p>
            <p className="mt-3 flex items-center gap-2 font-medium text-navy"><IconVolume size={15} className="text-gold-dark" /> Voice replies</p>
            <p className="mt-1.5 leading-relaxed">Use the speaker button in the chat header to have Raja read replies aloud.</p>
          </div>

          <div className="rounded-2xl bg-navy p-5 text-parchment/65">
            <p className="font-display text-xl text-gold">Prefer a human?</p>
            <p className="mt-1 text-xs leading-relaxed">
              Call or WhatsApp the shop during working hours — {shop?.hours?.[0]?.time || '10 AM to 9 PM'}.
            </p>
            <div className="mt-4 space-y-2 text-xs">
              <a href={`tel:+91${shop?.phone}`} className="flex items-center gap-2 text-parchment/80 hover:text-gold">
                <IconPhone size={14} /> +91 {shop?.phone}
              </a>
              <p className="flex items-center gap-2 text-parchment/50">
                <IconClock size={14} /> Mon–Sat 10 AM – 9 PM
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
