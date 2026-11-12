import { useState } from 'react';
import { Link } from 'react-router-dom';
import { spinWheel } from '../api/index.js';
import PageHero from '../components/PageHero.jsx';
import { toast } from '../store/toast.js';
import { formatDate } from '../utils/format.js';
import { IconArrowRight, IconCopy, IconGift, IconSparkles } from '../components/Icons.jsx';

const LABELS = [
  ['5%', 'OFF'],
  ['10%', 'OFF'],
  ['15%', 'OFF'],
  ['20%', 'OFF'],
  ['Free', 'Alteration'],
  ['Buy 2', 'Get 1'],
  ['30% OFF', 'Kurtas'],
  ['Try', 'Again'],
];

const COLORS = ['#14244C', '#1B315F', '#5A1D26', '#14244C', '#24406F', '#4E5B3C', '#A4832F', '#1B315F'];
const ANGLE = 360 / 8;
const CENTER = 170;
const RADIUS = 156;

const polar = (radius, angle) => {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(radians), CENTER + radius * Math.sin(radians)];
};

export default function SpinWheel() {
  const [mobile, setMobile] = useState('');
  const [started, setStarted] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [blockedAt, setBlockedAt] = useState('');

  const start = (event) => {
    event.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      toast.error('Enter a valid 10-digit mobile number to play.');
      return;
    }
    setStarted(true);
    setBlockedAt('');
  };

  const play = async () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    setBlockedAt('');
    try {
      const data = await spinWheel(mobile);
      const mid = data.index * ANGLE + ANGLE / 2;
      const current = ((rotation % 360) + 360) % 360;
      const desired = (360 - mid) % 360;
      const delta = (desired - current + 360) % 360;
      const target = rotation + 360 * 6 + delta;
      setRotation(target);

      window.setTimeout(() => {
        setResult(data);
        setSpinning(false);
        if (data.won) toast.success('You won a coupon!');
      }, 4300);
    } catch (error) {
      setSpinning(false);
      const payload = error?.response?.data;
      if (payload?.nextAvailableAt) setBlockedAt(payload.nextAvailableAt);
      toast.error(payload?.error || 'The wheel is stuck. Please try again.');
    }
  };

  const reset = () => {
    setResult(null);
    setRotation(0);
  };

  return (
    <div>
      <PageHero
        eyebrow="Spin to win"
        title="One spin. Up to 30% off."
        description="Enter your mobile number, spin the festive wheel and take a one-time coupon to checkout. One spin per mobile number each week."
        compact
      />

      <div className="container-x grid gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="rounded-3xl border border-navy/10 bg-white p-6 sm:p-9">
          <div className="mx-auto max-w-[380px]">
            <div className="relative">
              <svg viewBox="0 0 340 340" className="w-full drop-shadow-[0_25px_40px_rgba(15,27,60,0.25)]" role="img" aria-label="Prize wheel">
                <circle cx={CENTER} cy={CENTER} r={RADIUS + 8} fill="#0F1B3C" />
                <g
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: '170px 170px',
                    transition: 'transform 4.2s cubic-bezier(0.14, 0.72, 0.09, 1)',
                  }}
                >
                  {LABELS.map(([line1, line2], index) => {
                    const start = index * ANGLE;
                    const end = start + ANGLE;
                    const [x1, y1] = polar(RADIUS, start);
                    const [x2, y2] = polar(RADIUS, end);
                    const mid = start + ANGLE / 2;
                    const [textX, textY] = polar(RADIUS * 0.63, mid);
                    const flip = mid > 180;
                    return (
                      <g key={line1 + line2}>
                        <path
                          d={`M${CENTER} ${CENTER} L${x1} ${y1} A${RADIUS} ${RADIUS} 0 0 1 ${x2} ${y2} Z`}
                          fill={COLORS[index]}
                          stroke="#C9A84C"
                          strokeOpacity="0.45"
                          strokeWidth="1.5"
                        />
                        <text
                          x={textX}
                          y={textY}
                          transform={`rotate(${mid + (flip ? 180 : 0)} ${textX} ${textY})`}
                          textAnchor="middle"
                          fill={index === 6 ? '#0F1B3C' : '#F7F3EC'}
                          fontFamily="Georgia, serif"
                          fontSize="15"
                        >
                          <tspan x={textX}>{line1}</tspan>
                          <tspan x={textX} dy="15" fontSize="11" letterSpacing="1.5">{line2}</tspan>
                        </text>
                      </g>
                    );
                  })}
                </g>
                {Array.from({ length: 16 }).map((_, index) => {
                  const [x, y] = polar(RADIUS + 1, index * 22.5);
                  return <circle key={index} cx={x} cy={y} r="2.4" fill="#E8D5A3" opacity="0.7" />;
                })}
                <circle cx={CENTER} cy={CENTER} r="34" fill="#C9A84C" stroke="#0F1B3C" strokeWidth="4" />
                <text x={CENTER} y={CENTER + 6} textAnchor="middle" fontFamily="Georgia, serif" fontSize="16" fill="#0F1B3C">SPIN</text>
              </svg>
              <svg viewBox="0 0 340 340" className="pointer-events-none absolute inset-0 w-full">
                <path d="M170 4 L188 34 L152 34 Z" fill="#C9A84C" stroke="#0F1B3C" strokeWidth="2" />
              </svg>
            </div>
            <p className="mt-4 text-center text-[10px] uppercase tracking-[0.2em] text-ink/35">
              {spinning ? 'The wheel is deciding…' : 'Tap spin and hold your breath'}
            </p>
          </div>

          <div className="mt-7 border-t border-navy/10 pt-6">
            {!started ? (
              <form onSubmit={start} className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
                <input
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Your 10-digit mobile number"
                  inputMode="numeric"
                  className="input"
                  aria-label="Mobile number"
                />
                <button type="submit" className="btn-gold flex-none px-7">Start spinning</button>
              </form>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button type="button" onClick={play} disabled={spinning} className="btn-gold w-full max-w-xs">
                  {spinning ? 'Spinning…' : 'Spin the wheel'}
                </button>
                <p className="text-[11px] text-ink/40">
                  Playing for +91 {mobile.slice(0, 5)} {mobile.slice(5)} ·{' '}
                  <button type="button" onClick={() => { setStarted(false); setMobile(''); setResult(null); }} className="underline underline-offset-2 hover:text-navy">
                    change number
                  </button>
                </p>
              </div>
            )}
            {blockedAt && (
              <div className="mt-4 rounded-xl border border-error/25 bg-error/5 p-4 text-center text-xs text-error">
                You have already spun this week. The next spin unlocks on {formatDate(blockedAt)}.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {result ? (
            <div className={`rounded-3xl border p-6 text-center ${result.won ? 'border-gold/50 bg-gold/10' : 'border-navy/10 bg-white'}`}>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy text-gold">
                {result.won ? <IconSparkles size={22} /> : <IconGift size={22} />}
              </span>
              <p className="mt-4 text-[10px] uppercase tracking-[0.24em] text-gold-dark">{result.won ? 'You won' : 'This spin'}</p>
              <h2 className="mt-1 font-display text-[34px] leading-tight">{result.prize || 'Try again'}</h2>
              {result.won ? (
                <>
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
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm text-ink/50">{result.message}</p>
                  <Link to="/offers" className="btn-outline btn-sm mt-5">See current offers</Link>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-navy/10 bg-white p-6">
              <p className="eyebrow">Prize list</p>
              <h2 className="mt-2 font-display text-2xl">What’s on the wheel</h2>
              <ul className="mt-4 grid grid-cols-2 gap-2 text-xs text-ink/60">
                {['5% off', '10% off', '15% off', '20% off', 'Free alteration', 'Buy 2 get 1', '30% off kurtas', 'Try again'].map((prize) => (
                  <li key={prize} className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {prize}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] leading-relaxed text-ink/40">
                Coupons are valid for 48 hours, single use, and tied to the mobile number you play with. One spin per
                number per week. Playing does not place an order.
              </p>
            </div>
          )}

          <div className="rounded-2xl bg-navy p-5 text-parchment/70">
            <p className="font-display text-xl text-gold">Another challenge?</p>
            <p className="mt-1 text-xs leading-relaxed">Solve the nine-tile fabric puzzle for a straight 12% off coupon.</p>
            <Link to="/puzzle" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-parchment hover:text-gold">
              Try the puzzle <IconArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {result?.won && (
        <div className="container-x pb-8">
          <button type="button" onClick={reset} className="mx-auto block text-[11px] text-ink/35 underline underline-offset-4 hover:text-navy">
            Clear this result
          </button>
        </div>
      )}
    </div>
  );
}
