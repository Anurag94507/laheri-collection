import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { solvePuzzle } from '../api/index.js';
import PageHero from '../components/PageHero.jsx';
import { toast } from '../store/toast.js';
import { formatDate } from '../utils/format.js';
import { IconArrowRight, IconClock, IconCopy, IconPuzzle, IconSparkles } from '../components/Icons.jsx';

const SOLVED = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const shuffled = () => {
  const tiles = [...SOLVED];
  for (let i = tiles.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  if (tiles.every((value, index) => value === index)) {
    [tiles[0], tiles[1]] = [tiles[1], tiles[0]];
  }
  return tiles;
};

export default function PuzzleGame() {
  const [mobile, setMobile] = useState('');
  const [started, setStarted] = useState(false);
  const [tiles, setTiles] = useState(shuffled);
  const [selected, setSelected] = useState(null);
  const [moves, setMoves] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const solvedRef = useRef(false);

  const begin = (event) => {
    event.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      toast.error('Enter a valid 10-digit mobile number to play.');
      return;
    }
    setTiles(shuffled());
    setSelected(null);
    setMoves(0);
    setSecondsLeft(120);
    setStatus('playing');
    setResult(null);
    solvedRef.current = false;
    setStarted(true);
  };

  const finish = useCallback(
    async (timeTaken) => {
      if (solvedRef.current) return;
      solvedRef.current = true;
      setStatus('won');
      try {
        const data = await solvePuzzle({ mobile, timeTaken });
        setResult(data);
        toast.success('Puzzle solved — coupon unlocked!');
      } catch (error) {
        setStatus('error');
        toast.error(error?.response?.data?.error || 'Could not generate your coupon.');
      }
    },
    [mobile]
  );

  useEffect(() => {
    if (status !== 'playing') return undefined;
    if (secondsLeft <= 0) {
      setStatus('lost');
      return undefined;
    }
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [status, secondsLeft]);

  useEffect(() => {
    if (status !== 'playing') return;
    if (tiles.every((value, index) => value === index)) {
      finish(120 - secondsLeft);
    }
  }, [tiles, status, secondsLeft, finish]);

  const clickTile = (position) => {
    if (status !== 'playing') return;
    if (selected === null) {
      setSelected(position);
      return;
    }
    if (selected === position) {
      setSelected(null);
      return;
    }
    setTiles((current) => {
      const next = [...current];
      [next[selected], next[position]] = [next[position], next[selected]];
      return next;
    });
    setSelected(null);
    setMoves((value) => value + 1);
  };

  const restart = () => {
    setTiles(shuffled());
    setSelected(null);
    setMoves(0);
    setSecondsLeft(120);
    setStatus('playing');
    setResult(null);
    solvedRef.current = false;
  };

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div>
      <PageHero
        eyebrow="Fabric puzzle"
        title="Nine tiles. Two minutes."
        description="Put the sherwani back together. Tap two tiles to swap them. Solve it and a 12% off coupon is yours for 24 hours."
        compact
      />

      <div className="container-x grid gap-10 py-12 lg:grid-cols-[1fr_0.85fr] lg:items-start">
        <div className="rounded-3xl border border-navy/10 bg-white p-6 sm:p-8">
          {!started ? (
            <form onSubmit={begin} className="mx-auto max-w-md space-y-4 py-6 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-dark">
                <IconPuzzle size={28} />
              </span>
              <div>
                <h2 className="font-display text-2xl">Before you start</h2>
                <p className="mt-1 text-sm text-ink/50">Enter your mobile number so we can attach the coupon to you.</p>
              </div>
              <input
                value={mobile}
                onChange={(event) => setMobile(event.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                inputMode="numeric"
                className="input text-center"
                aria-label="Mobile number"
              />
              <button type="submit" className="btn-gold w-full">Start the timer</button>
              <p className="text-[11px] text-ink/40">One winning coupon per mobile number per day.</p>
            </form>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-navy">
                  <IconClock size={14} className="text-gold-dark" />
                  <span className={secondsLeft <= 20 ? 'text-error' : ''}>{minutes}:{seconds}</span>
                </div>
                <p className="text-xs text-ink/45">{moves} moves</p>
                <button type="button" onClick={restart} className="text-[11px] font-medium text-ink/45 underline underline-offset-4 hover:text-navy">
                  Shuffle again
                </button>
              </div>

              <div className="mx-auto grid max-w-md grid-cols-3 gap-1.5 overflow-hidden rounded-xl bg-navy p-1.5">
                {tiles.map((value, position) => {
                  const row = Math.floor(value / 3);
                  const column = value % 3;
                  return (
                    <button
                      key={position}
                      type="button"
                      onClick={() => clickTile(position)}
                      className={`relative aspect-square overflow-hidden rounded-md bg-cover transition ${
                        selected === position ? 'ring-4 ring-gold ring-offset-2 ring-offset-navy' : 'hover:brightness-110'
                      } ${status !== 'playing' ? 'cursor-default' : ''}`}
                      style={{
                        backgroundImage: 'url(/images/puzzle.svg)',
                        backgroundSize: '300% 300%',
                        backgroundPosition: `${column * 50}% ${row * 50}%`,
                      }}
                      aria-label={`Puzzle tile ${position + 1}`}
                    >
                      {selected === position && <span className="absolute inset-0 bg-gold/15" />}
                    </button>
                  );
                })}
              </div>

              {status === 'lost' && (
                <div className="mt-5 rounded-xl border border-error/25 bg-error/5 p-4 text-center text-sm text-error">
                  Time up! Better luck next time — you can try again tomorrow.
                </div>
              )}
              {status === 'won' && !result && (
                <p className="mt-5 text-center text-sm text-ink/50">Solved! Generating your coupon…</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {result?.coupon ? (
            <div className="rounded-3xl border border-gold/50 bg-gold/10 p-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy text-gold">
                <IconSparkles size={22} />
              </span>
              <p className="mt-4 text-[10px] uppercase tracking-[0.24em] text-gold-dark">Puzzle solved</p>
              <h2 className="mt-1 font-display text-[32px] leading-tight">12% off unlocked</h2>
              <div className="mt-5 flex items-center justify-center gap-3 rounded-xl border border-dashed border-gold/70 bg-white px-4 py-3">
                <span className="font-mono text-lg font-semibold tracking-[0.18em] text-navy">{result.coupon.code}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(result.coupon.code);
                    toast.success('Coupon copied.');
                  }}
                  className="text-navy/40 hover:text-navy"
                  aria-label="Copy coupon"
                >
                  <IconCopy size={16} />
                </button>
              </div>
              <p className="mt-3 text-[11px] text-ink/45">Valid until {formatDate(result.coupon.validUntil)} · single use</p>
              <Link to="/collections" className="btn-navy btn-sm mt-5">Use it now <IconArrowRight size={14} /></Link>
            </div>
          ) : (
            <div className="rounded-3xl border border-navy/10 bg-white p-6">
              <p className="eyebrow">How to play</p>
              <h2 className="mt-2 font-display text-2xl">Reassemble the sherwani</h2>
              <ol className="mt-4 space-y-3 text-xs text-ink/55">
                {[
                  'Enter your mobile number and start the two-minute timer.',
                  'Tap one tile, then tap another to swap their positions.',
                  'Keep going until the picture lines up perfectly.',
                  'Win a 12% off coupon valid for 24 hours.',
                ].map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-navy text-[10px] font-semibold text-gold">{index + 1}</span>
                    <span className="pt-0.5 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="rounded-2xl bg-navy p-5 text-parchment/70">
            <p className="font-display text-xl text-gold">Feeling lucky?</p>
            <p className="mt-1 text-xs leading-relaxed">Spin the wheel for a chance at 30% off kurtas or a free alteration.</p>
            <Link to="/spin-wheel" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-parchment hover:text-gold">
              Spin the wheel <IconArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
