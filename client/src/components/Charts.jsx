import { formatINR } from '../utils/format.js';

const compact = (value) => {
  const number = Number(value) || 0;
  if (number >= 100000) return `₹${(number / 100000).toFixed(1)}L`;
  if (number >= 1000) return `₹${(number / 1000).toFixed(1)}k`;
  return `₹${Math.round(number)}`;
};

export function RevenueBars({ data = [] }) {
  const width = 340;
  const height = 180;
  const padding = { top: 18, right: 8, bottom: 26, left: 28 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((entry) => Number(entry.total) || 0), 1);
  const step = plotWidth / Math.max(data.length, 1);
  const barWidth = Math.min(step * 0.45, 30);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Weekly revenue bar chart">
      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
        const y = padding.top + plotHeight * fraction;
        return (
          <g key={fraction}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#0F1B3C" strokeOpacity="0.08" strokeDasharray="3 4" />
            <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize="7" fill="#1A1A2E" fillOpacity="0.4">
              {compact(max * (1 - fraction))}
            </text>
          </g>
        );
      })}
      {data.map((entry, index) => {
        const value = Number(entry.total) || 0;
        const barHeight = Math.max((value / max) * plotHeight, value > 0 ? 3 : 0);
        const x = padding.left + step * index + (step - barWidth) / 2;
        const y = padding.top + plotHeight - barHeight;
        return (
          <g key={`${entry.day}-${index}`}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx="4" fill={index === data.length - 1 ? '#C9A84C' : '#0F1B3C'} fillOpacity={index === data.length - 1 ? 1 : 0.7} />
            {value > 0 && (
              <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fontSize="7" fill="#0F1B3C" fillOpacity="0.55">
                {compact(value)}
              </text>
            )}
            <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" fontSize="8" fill="#1A1A2E" fillOpacity="0.45">
              {entry.day}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const PIE_COLORS = ['#0F1B3C', '#C9A84C', '#5A1D26', '#4E5B3C', '#6F93B8', '#A4832F', '#24406F'];

export function CategoryDonut({ data = [] }) {
  const total = data.reduce((sum, entry) => sum + Number(entry.total), 0);
  const items = data.slice(0, 6);
  let offset = 0;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <svg viewBox="0 0 42 42" className="h-32 w-32 flex-none -rotate-90" role="img" aria-label="Category sales donut chart">
        <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#0F1B3C" strokeOpacity="0.07" strokeWidth="6" />
        {items.map((entry, index) => {
          const percent = total > 0 ? (Number(entry.total) / total) * 100 : 0;
          const circle = (
            <circle
              key={entry.name}
              cx="21"
              cy="21"
              r="15.9155"
              fill="none"
              stroke={PIE_COLORS[index % PIE_COLORS.length]}
              strokeWidth="6"
              strokeDasharray={`${percent} ${100 - percent}`}
              strokeDashoffset={-offset}
            />
          );
          offset += percent;
          return circle;
        })}
      </svg>
      <ul className="flex-1 space-y-2">
        {items.length === 0 && <li className="text-xs text-ink/40">No sales recorded yet.</li>}
        {items.map((entry, index) => (
          <li key={entry.name} className="flex items-center justify-between gap-3 text-[11px]">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 flex-none rounded-full" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
              <span className="truncate text-ink/60">{entry.name}</span>
            </span>
            <span className="font-medium text-navy">{formatINR(entry.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AcquisitionLine({ data = [] }) {
  const width = 340;
  const height = 150;
  const padding = { top: 14, right: 10, bottom: 22, left: 10 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((entry) => Number(entry.count) || 0), 1);
  const points = data.map((entry, index) => {
    const x = padding.left + (plotWidth / Math.max(data.length - 1, 1)) * index;
    const y = padding.top + plotHeight - (Number(entry.count) / max) * plotHeight;
    return [x, y];
  });
  const line = points.map(([x, y]) => `${x},${y}`).join(' ');
  const area = `${padding.left},${padding.top + plotHeight} ${line} ${padding.left + plotWidth},${padding.top + plotHeight}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Customer acquisition line chart">
      <defs>
        <linearGradient id="acq" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C9A84C" stopOpacity="0.35" />
          <stop offset="1" stopColor="#C9A84C" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((fraction) => (
        <line
          key={fraction}
          x1={padding.left}
          y1={padding.top + plotHeight * fraction}
          x2={width - padding.right}
          y2={padding.top + plotHeight * fraction}
          stroke="#0F1B3C"
          strokeOpacity="0.08"
          strokeDasharray="3 4"
        />
      ))}
      {points.length > 1 && <polygon points={area} fill="url(#acq)" />}
      {points.length > 1 && <polyline points={line} fill="none" stroke="#C9A84C" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />}
      {points.map(([x, y], index) => (
        <circle key={index} cx={x} cy={y} r="3" fill="#0F1B3C" stroke="#C9A84C" strokeWidth="1.5" />
      ))}
      {data.map((entry, index) => {
        const x = padding.left + (plotWidth / Math.max(data.length - 1, 1)) * index;
        return (
          <text key={`${entry.label}-${index}`} x={x} y={height - 6} textAnchor="middle" fontSize="7" fill="#1A1A2E" fillOpacity="0.45">
            {entry.label}
          </text>
        );
      })}
    </svg>
  );
}
