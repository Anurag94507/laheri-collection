import { useEffect, useState } from 'react';
import { getChatLogs } from '../../api/index.js';
import { toast } from '../../store/toast.js';
import { IconChat, IconSearch } from '../../components/Icons.jsx';

export default function ChatLogs() {
  const [data, setData] = useState({ logs: [], total: 0, sessions: 0, pages: 1 });
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getChatLogs({ q: query || undefined, page, limit: 30 })
      .then((response) => alive && setData(response))
      .catch(() => alive && toast.error('Could not load chatbot chats.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [query, page]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total messages', value: data.total },
          { label: 'Chat sessions', value: data.sessions },
          { label: 'Showing', value: data.logs.length },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-navy/10 bg-surface px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink/40">{stat.label}</p>
            <p className="mt-1 font-display text-3xl text-navy">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-navy/10 bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 px-5 py-4">
          <div>
            <p className="font-display text-xl text-navy">Chatbot conversations</p>
            <p className="text-[11px] text-ink/40">What customers asked the assistant, newest first</p>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
            }}
            className="flex items-center gap-2 rounded-full border border-navy/10 px-3 py-1.5"
          >
            <IconSearch size={14} className="text-ink/35" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search messages"
              className="w-44 bg-transparent text-xs outline-none placeholder:text-ink/30"
            />
          </form>
        </div>

        {loading ? (
          <p className="px-5 py-10 text-sm text-ink/40">Loading chats…</p>
        ) : data.logs.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <IconChat size={26} className="mx-auto text-navy/20" />
            <p className="mt-3 text-sm text-ink/45">No chats match this search yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-navy/5">
            {data.logs.map((log) => (
              <li key={log._id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/35">
                    {log.sessionId}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="badge bg-navy/5 text-navy/60">{log.source}</span>
                    <span className="text-[10px] text-ink/35">
                      {new Date(log.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-navy">{log.preview}</p>
                <p className="mt-1 border-l-2 border-gold/50 pl-3 text-xs leading-relaxed text-ink/50">
                  {log.replyPreview}
                </p>
              </li>
            ))}
          </ul>
        )}

        {data.pages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-navy/10 px-5 py-4">
            {Array.from({ length: data.pages }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPage(index + 1)}
                className={`h-8 min-w-[32px] rounded-full px-2 text-xs ${
                  page === index + 1 ? 'bg-navy text-surface' : 'border border-navy/15 text-navy/60'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
