import { useEffect, useState } from 'react';
import {
  getCampaignLogs,
  previewAudience,
  sendBulkCampaign,
  sendWhatsAppToAll,
} from '../../api/index.js';
import { toast } from '../../store/toast.js';
import { IconSend, IconWhatsApp } from '../../components/Icons.jsx';

const AUDIENCES = [
  { value: 'all', label: 'All customers', hint: 'Everyone with a mobile number' },
  { value: 'recent', label: 'Recent visitors', hint: 'Visited in the last 30 days' },
  { value: 'vip', label: 'VIP / high spenders', hint: '₹10,000+ or tagged VIP' },
  { value: 'inactive', label: 'Inactive', hint: 'No visit for 90+ days' },
];

const DEFAULT_MESSAGE =
  'Namaste {name}! New arrivals have landed at {shop_name}. Flat 20% off this week — walk in or order online.';

export default function BulkSend() {
  const [audience, setAudience] = useState('all');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [preview, setPreview] = useState({ count: 0, sample: [], preview: '' });
  const [campaigns, setCampaigns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [links, setLinks] = useState([]);

  const loadLogs = () => {
    getCampaignLogs()
      .then((data) => setCampaigns(data.campaigns || []))
      .catch(() => {});
  };

  useEffect(loadLogs, []);

  useEffect(() => {
    previewAudience({ audience, message })
      .then((data) => setPreview(data))
      .catch(() => {});
  }, [audience, message]);

  const send = async () => {
    if (!message.trim()) return toast.error('Compose a WhatsApp message first.');
    setBusy(true);
    try {
      const data = await sendBulkCampaign({
        audience,
        audienceLabel: AUDIENCES.find((entry) => entry.value === audience)?.label,
        message,
        channels: ['whatsapp'],
      });
      toast.success(data.message);
      loadLogs();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not send the broadcast.');
    } finally {
      setBusy(false);
    }
  };

  const sendAll = async () => {
    setBusy(true);
    try {
      const data = await sendWhatsAppToAll({ message });
      setLinks(data.links || []);
      toast.success(data.message);
      loadLogs();
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not prepare the WhatsApp broadcast.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <div className="rounded-2xl border border-navy/10 bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-xl text-navy">WhatsApp broadcast</p>
              <p className="mt-1 text-[11px] text-ink/40">
                Every customer with a mobile number — one channel only, WhatsApp.
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-green-600/10 px-3 py-1.5 text-[11px] font-medium text-green-700">
              <IconWhatsApp size={13} /> WhatsApp only
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {AUDIENCES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAudience(option.value)}
                className={`rounded-xl border px-3.5 py-2.5 text-left transition ${
                  audience === option.value
                    ? 'border-gold bg-gold/10'
                    : 'border-navy/10 hover:border-gold/50'
                }`}
              >
                <p className="text-xs font-semibold text-navy">{option.label}</p>
                <p className="text-[10px] text-ink/40">{option.hint}</p>
              </button>
            ))}
          </div>

          <label className="mt-5 block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">
              Message
            </span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              className="admin-input resize-none"
            />
            <span className="mt-1 block text-[10px] text-ink/35">
              Merge tags: {'{name}'} · {'{shop_name}'} · {'{offer}'} · {'{date}'}
            </span>
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={send} disabled={busy} className="btn-navy btn-sm disabled:opacity-60">
              <IconSend size={14} /> {busy ? 'Sending…' : `Send to ${preview.count} contacts`}
            </button>
            <button
              type="button"
              onClick={sendAll}
              disabled={busy}
              className="btn-gold btn-sm disabled:opacity-60"
            >
              <IconWhatsApp size={14} /> One-click WhatsApp to all
            </button>
          </div>
        </div>

        {links.length > 0 && (
          <div className="rounded-2xl border border-green-600/20 bg-green-50/60 p-5">
            <p className="font-display text-lg text-navy">WhatsApp chats prepared</p>
            <p className="mt-1 text-[11px] text-ink/50">
              Open each chat to deliver the message. {links.length} contacts.
            </p>
            <div className="mt-3 grid max-h-64 gap-1.5 overflow-y-auto sm:grid-cols-2">
              {links.map((entry) => (
                <a
                  key={entry.mobile}
                  href={entry.link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-[11px] text-navy shadow-sm transition hover:bg-gold/10"
                >
                  <span className="truncate">{entry.name || entry.mobile}</span>
                  <IconWhatsApp size={13} className="flex-none text-green-700" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-navy/10 bg-surface">
          <div className="border-b border-navy/10 px-5 py-4">
            <p className="font-display text-xl text-navy">Campaign history</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy/5 text-[10px] uppercase tracking-[0.14em] text-ink/45">
                <tr>
                  <th className="px-5 py-2.5">When</th>
                  <th className="px-3 py-2.5">Audience</th>
                  <th className="px-3 py-2.5">Sent</th>
                  <th className="px-3 py-2.5">Failed</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {campaigns.map((campaign) => (
                  <tr key={campaign._id}>
                    <td className="px-5 py-2.5 text-ink/50">
                      {new Date(campaign.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className="px-3 py-2.5 text-navy/70">{campaign.audienceLabel || campaign.audience}</td>
                    <td className="px-3 py-2.5 text-navy">{campaign.sentCount ?? 0}</td>
                    <td className="px-3 py-2.5 text-error/80">{campaign.failedCount ?? 0}</td>
                    <td className="px-3 py-2.5">
                      <span className="badge bg-navy/5 text-navy/60">{campaign.status}</span>
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-ink/40">
                      No campaigns sent yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <aside className="h-fit space-y-4">
        <div className="rounded-2xl border border-navy/10 bg-surface p-5">
          <p className="font-display text-xl text-navy">Preview</p>
          <p className="mt-1 text-[11px] text-ink/40">
            {preview.count} contact{preview.count === 1 ? '' : 's'} in this audience
          </p>
          <div className="mt-3 rounded-xl rounded-tl-sm bg-green-50 p-3 text-[12px] leading-relaxed text-navy/80">
            {preview.preview || message}
          </div>
          <ul className="mt-3 space-y-1.5">
            {(preview.sample || []).map((entry) => (
              <li key={entry.mobile} className="flex items-center justify-between text-[11px] text-ink/50">
                <span>{entry.name}</span>
                <span className="font-mono">{entry.mobile}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5 text-[11px] leading-relaxed text-navy/60">
          <p className="font-display text-base text-navy">How delivery works</p>
          <p className="mt-2">
            Sends instantly when WhatsApp Business (Twilio) credentials are configured on the server.
            Without them the shop prepares ready-to-open WhatsApp chats and logs the campaign, so
            nothing is lost.
          </p>
        </div>
      </aside>
    </div>
  );
}
