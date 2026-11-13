import { useEffect, useState } from 'react';
import { getGameConfig, getGameCoupons, updateGameConfig } from '../../api/index.js';
import { toast } from '../../store/toast.js';
import { IconGift } from '../../components/Icons.jsx';

const DEFAULTS = {
  spinEnabled: true,
  puzzleEnabled: true,
  quizEnabled: true,
  puzzleDiscount: 12,
  quizDiscount: 10,
  spinValidityHours: 48,
  puzzleValidityHours: 24,
  quizValidityHours: 24,
  spinCooldownDays: 7,
};

export default function GamesAdmin() {
  const [games, setGames] = useState(DEFAULTS);
  const [coupons, setCoupons] = useState([]);
  const [plays, setPlays] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([getGameConfig(), getGameCoupons()])
      .then(([config, list]) => {
        setGames({ ...DEFAULTS, ...config.games });
        setCoupons(list.coupons || []);
        setPlays(list.plays || []);
      })
      .catch(() => toast.error('Could not load game settings.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await updateGameConfig(games);
      setGames({ ...DEFAULTS, ...data.games });
      toast.success(data.message);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not save the offers.');
    } finally {
      setBusy(false);
    }
  };

  const field = (key, label, suffix = '', min = 0, max = 100) => (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-navy/50">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={min}
          max={max}
          value={games[key]}
          onChange={(event) => setGames({ ...games, [key]: Number(event.target.value) })}
          className="admin-input py-2 text-sm"
        />
        {suffix && <span className="text-[11px] text-ink/40">{suffix}</span>}
      </div>
    </label>
  );

  const toggle = (key, label, description) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-navy/10 p-3.5">
      <input
        type="checkbox"
        checked={Boolean(games[key])}
        onChange={(event) => setGames({ ...games, [key]: event.target.checked })}
        className="mt-0.5 h-4 w-4 accent-[#C9A84C]"
      />
      <span>
        <span className="block text-xs font-semibold text-navy">{label}</span>
        <span className="block text-[10px] text-ink/40">{description}</span>
      </span>
    </label>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <form onSubmit={save} className="rounded-2xl border border-navy/10 bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-xl text-navy">Game controls</p>
            <p className="mt-1 text-[11px] text-ink/40">Host the games and set the offer each one gives.</p>
          </div>
          <IconGift size={20} className="text-gold-dark" />
        </div>

        <div className="mt-4 space-y-2">
          {toggle('spinEnabled', 'Spin the wheel', 'Weekly spin with a coupon prize')}
          {toggle('puzzleEnabled', 'Fabric puzzle', 'Solve the 9-tile puzzle for a discount')}
          {toggle('quizEnabled', 'Style quiz', 'Answer 3 questions correctly')}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {field('puzzleDiscount', 'Puzzle discount', '%')}
          {field('quizDiscount', 'Quiz discount', '%')}
          {field('spinValidityHours', 'Spin coupon valid', 'hours', 1, 720)}
          {field('puzzleValidityHours', 'Puzzle coupon valid', 'hours', 1, 720)}
          {field('quizValidityHours', 'Quiz coupon valid', 'hours', 1, 720)}
          {field('spinCooldownDays', 'Spin cooldown', 'days', 1, 365)}
        </div>

        <p className="mt-4 rounded-xl bg-navy/5 px-3.5 py-3 text-[11px] leading-relaxed text-ink/55">
          Spin wheel prizes are fixed segments (5%–30% off and offers); the settings above control how
          long the coupon lasts and how often a customer can spin. Puzzle and quiz discounts apply
          immediately to new wins.
        </p>

        <button type="submit" disabled={busy} className="btn-navy mt-5 w-full disabled:opacity-60">
          {busy ? 'Saving…' : 'Save game offers'}
        </button>
      </form>

      <div className="space-y-5">
        <div className="rounded-2xl border border-navy/10 bg-surface">
          <div className="flex items-center justify-between border-b border-navy/10 px-5 py-4">
            <p className="font-display text-xl text-navy">Won coupons</p>
            <span className="text-[11px] text-ink/40">{coupons.length} total</span>
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy/5 text-[10px] uppercase tracking-[0.14em] text-ink/45">
                <tr>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-2 py-2">Game</th>
                  <th className="px-2 py-2">Value</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {coupons.slice(0, 50).map((coupon) => (
                  <tr key={coupon._id}>
                    <td className="px-4 py-2 font-mono text-[11px] text-navy">{coupon.code}</td>
                    <td className="px-2 py-2 text-ink/50">{coupon.source}</td>
                    <td className="px-2 py-2 text-navy/70">
                      {coupon.discountType === 'percent' ? `${coupon.discountValue}%` : coupon.label}
                    </td>
                    <td className="px-2 py-2">
                      <span className={`badge ${coupon.isUsed ? 'bg-navy/5 text-ink/45' : 'bg-gold/15 text-gold-dark'}`}>
                        {coupon.isUsed ? 'used' : 'open'}
                      </span>
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-ink/40">
                      No coupons won yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-navy/10 bg-surface p-5">
          <p className="font-display text-xl text-navy">Recent plays</p>
          {plays.length === 0 ? (
            <p className="mt-2 text-xs text-ink/40">No plays recorded yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {plays.slice(0, 8).map((play) => (
                <li key={play._id} className="flex items-center justify-between text-[11px]">
                  <span className="capitalize text-navy/70">{play.game}</span>
                  <span className="font-mono text-ink/40">{play.mobile}</span>
                  <span className={play.won ? 'text-green-700' : 'text-ink/40'}>
                    {play.won ? play.prize || 'won' : 'no prize'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
