import { useEffect, useRef, useState } from 'react';
import { sendChatMessage } from '../api/index.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { toast } from '../store/toast.js';
import { IconMic, IconSend, IconSparkles, IconVolume, IconVolumeOff } from './ChatIcons.jsx';

const DEFAULT_SUGGESTIONS = ['Opening hours', 'New arrivals', 'Wedding sherwanis', 'Track my order'];

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `m-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const readSession = () => {
  try {
    const existing = sessionStorage.getItem('laheri-chat-session');
    if (existing) return existing;
    const created = newId();
    sessionStorage.setItem('laheri-chat-session', created);
    return created;
  } catch {
    return newId();
  }
};

export default function ChatPanel({ compact = false }) {
  const { settings } = useSettings();
  const welcome = settings?.chatbot?.welcome || 'Namaste! Main Laheri hoon, aapka shop assistant. Kaise madad kar sakta hoon?';
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'assistant', content: welcome }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const sessionRef = useRef(readSession());
  const endRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    setMessages((previous) =>
      previous.length === 1 && previous[0].role === 'assistant'
        ? [{ ...previous[0], content: welcome }]
        : previous
    );
  }, [welcome]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  useEffect(() => () => recognitionRef.current?.stop?.(), []);

  const speak = (text) => {
    if (!voiceOn || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text).replace(/[*_#]/g, ''));
    utterance.lang = 'en-IN';
    utterance.rate = 0.98;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const send = async (rawText) => {
    const text = String(rawText || '').trim();
    if (!text || busy) return;

    const userMessage = { id: newId(), role: 'user', content: text };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput('');
    setBusy(true);

    try {
      const data = await sendChatMessage({
        sessionId: sessionRef.current,
        messages: history.map(({ role, content }) => ({ role, content })),
      });
      setMessages((previous) => [...previous, { id: newId(), role: 'assistant', content: data.reply }]);
      setSuggestions(data.suggestions?.length ? data.suggestions : DEFAULT_SUGGESTIONS);
      speak(data.reply);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          id: newId(),
          role: 'assistant',
          content:
            'Sorry, I could not reach the shop system just now. Please call us on ' +
            (settings?.shop?.phone || 'the shop number') +
            ' or try again in a minute.',
        },
      ]);
      toast.error(error?.response?.data?.error || 'Assistant unavailable.');
    } finally {
      setBusy(false);
    }
  };

  const startListening = () => {
    const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!Recognition) {
      toast.error('Voice input is not supported in this browser. Chrome or Edge works best.');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      send(transcript);
    };
    recognition.onerror = () => {
      setListening(false);
      toast.error('Could not hear that. Please try again.');
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  return (
    <div className={`flex h-full min-h-0 flex-col ${compact ? '' : 'overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-soft'}`}>
      {!compact && (
        <div className="flex items-center justify-between gap-3 border-b border-navy/10 bg-navy px-5 py-4 text-surface">
          <div className="flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gold text-navy">
              <IconSparkles size={19} />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-navy bg-success" />
            </span>
            <div>
              <p className="font-display text-lg leading-none">Laheri</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-parchment/60">Shop assistant · online</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !voiceOn;
              setVoiceOn(next);
              if (!next && 'speechSynthesis' in window) window.speechSynthesis.cancel();
              toast.info(next ? 'Voice replies on' : 'Voice replies off');
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
              voiceOn ? 'border-gold bg-gold text-navy' : 'border-parchment/30 text-parchment/70 hover:border-gold'
            }`}
            aria-label="Toggle voice replies"
            title="Voice replies"
          >
            {voiceOn ? <IconVolume size={17} /> : <IconVolumeOff size={17} />}
          </button>
        </div>
      )}

      <div className={`flex-1 space-y-3 overflow-y-auto px-4 py-4 ${compact ? 'bg-surface/40' : 'bg-surface/50'}`}>
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                message.role === 'user'
                  ? 'rounded-br-sm bg-navy text-surface'
                  : 'rounded-bl-sm border border-navy/10 bg-white text-ink/85'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-navy/10 bg-white px-4 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-navy/10 bg-white px-3 pb-3 pt-2.5">
        <div className="mb-2 flex gap-1.5 overflow-x-auto hide-scrollbar">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => send(suggestion)}
              disabled={busy}
              className="flex-none rounded-full border border-navy/12 px-3 py-1.5 text-[11px] text-navy/70 transition hover:border-gold hover:text-navy disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
          className="flex items-center gap-1.5"
        >
          <button
            type="button"
            onClick={startListening}
            className={`flex h-10 w-10 flex-none items-center justify-center rounded-full border transition ${
              listening ? 'animate-pulse border-error bg-error text-white' : 'border-navy/15 text-navy/60 hover:border-gold hover:text-navy'
            }`}
            aria-label="Voice input"
            title="Speak to Laheri"
          >
            <IconMic size={17} />
          </button>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about fit, offers or delivery…"
            className="h-10 min-w-0 flex-1 rounded-full border border-navy/12 bg-surface px-4 text-[13px] outline-none transition focus:border-gold"
            aria-label="Message"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gold text-navy transition hover:bg-gold-light disabled:opacity-40"
            aria-label="Send message"
          >
            <IconSend size={17} />
          </button>
        </form>
        <p className="mt-1.5 text-center text-[9px] uppercase tracking-[0.16em] text-ink/30">
          AI assistant · prices confirmed on product pages
        </p>
      </div>
    </div>
  );
}
