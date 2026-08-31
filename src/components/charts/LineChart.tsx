import type { SeriesPoint } from "@/lib/charts/series";

/**
 * Simple dot graph (§4 flat, high-contrast). Plots one dot per logged value,
 * evenly spaced in order; draws a single connecting line ONLY when there are 2+
 * dots (one dot stands alone). Empty periods are dropped, never shown as gaps or
 * zeros. Minimal chrome — a light min/max scale, first/last dates, and the
 * latest value. Server-rendered static SVG, zero client JS.
 */
export function LineChart({
  points,
  color = "#e10600",
  targetLine = null,
  targetLabel = "target",
  ariaLabel,
  formatValue = (n) => String(Math.round(n)),
}: {
  points: SeriesPoint[];
  color?: string;
  targetLine?: number | null;
  targetLabel?: string;
  ariaLabel: string;
  formatValue?: (n: number) => string;
}) {
  // Compact: keep only logged points, in order. These are the dots.
  const dots = points.filter((p): p is { date: string; value: number } => p.value != null);
  if (dots.length === 0) {
    return <p className="font-body text-sm text-ink/50">Not enough data yet — keep logging and this fills in.</p>;
  }

  const W = 340;
  const H = 170;
  const padL = 34;
  const padR = 14;
  const padT = 16;
  const padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const vals = [...dots.map((d) => d.value), ...(targetLine != null ? [targetLine] : [])];
  const dataMin = Math.min(...vals);
  const dataMax = Math.max(...vals);
  const span = dataMax - dataMin || Math.abs(dataMax) || 1;
  const lo = dataMin - span * 0.12;
  const hi = dataMax + span * 0.12;
  const range = hi - lo || 1;

  const n = dots.length;
  const x = (i: number) => (n === 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW);
  const y = (v: number) => padT + (1 - (v - lo) / range) * plotH;

  const line = n >= 2 ? dots.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(" ") : "";

  const fmtDate = (iso: string) => {
    const d = new Date(`${iso}T00:00:00Z`);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  };
  const lastIdx = n - 1;

  return (
    <figure className="mx-auto m-0 w-full max-w-[420px]">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel} className="block">
        {/* light min/max scale */}
        {[hi - range * 0.12, lo + range * 0.12].map((t, i) => (
          <text key={i} x={padL - 6} y={y(t) + 3} textAnchor="end" className="fill-ink/35" style={{ font: "500 9px sans-serif" }}>
            {formatValue(t)}
          </text>
        ))}

        {/* optional target reference */}
        {targetLine != null ? (
          <>
            <line x1={padL} x2={W - padR} y1={y(targetLine)} y2={y(targetLine)} stroke="#e10600" strokeWidth={1.25} strokeDasharray="4 3" opacity={0.6} vectorEffect="non-scaling-stroke" />
            <text x={W - padR} y={y(targetLine) - 3} textAnchor="end" className="fill-red" style={{ font: "600 8px sans-serif" }}>
              {targetLabel} {formatValue(targetLine)}
            </text>
          </>
        ) : null}

        {/* connecting line (only when 2+ dots) */}
        {line ? <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" /> : null}

        {/* the dots */}
        {dots.map((d, i) => {
          const last = i === lastIdx;
          return (
            <g key={i}>
              {last ? <circle cx={x(i)} cy={y(d.value)} r={7} fill={color} opacity={0.2} /> : null}
              <circle cx={x(i)} cy={y(d.value)} r={last ? 4.5 : 3.25} fill={color} stroke="#0b0b0d" strokeWidth={1.25} />
            </g>
          );
        })}

        {/* first / last date */}
        <text x={padL} y={H - 7} textAnchor="start" className="fill-ink/35" style={{ font: "500 9px sans-serif" }}>{fmtDate(dots[0].date)}</text>
        {n >= 2 ? <text x={W - padR} y={H - 7} textAnchor="end" className="fill-ink/35" style={{ font: "500 9px sans-serif" }}>{fmtDate(dots[lastIdx].date)}</text> : null}
      </svg>
      <figcaption className="mt-1 text-right font-label text-[10px] uppercase tracking-wide text-ink/55">
        now {formatValue(dots[lastIdx].value)}
      </figcaption>
    </figure>
  );
}
