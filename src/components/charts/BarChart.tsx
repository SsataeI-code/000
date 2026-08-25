import type { WeekPoint } from "@/lib/charts/series";

/**
 * Weekly bar chart — bold and friendly (§4 flat, no gradients). Each week is a
 * chunky rounded bar sitting in a faint track (a "meter" look), with a big value
 * on top and the week under it. Bars that hit their target read green; the rest
 * take the chart's accent colour. Server SVG, zero client JS.
 */
export function BarChart({
  weeks,
  target = null,
  targetLabel = "target",
  color = "#e10600",
  goodColor = "#34c759",
  ariaLabel,
  formatValue = (n) => String(Math.round(n)),
}: {
  weeks: WeekPoint[];
  target?: number | null;
  targetLabel?: string;
  color?: string;
  goodColor?: string;
  ariaLabel: string;
  formatValue?: (n: number) => string;
}) {
  const weekVals = weeks.map((w) => w.value).filter((v): v is number => v != null);
  if (weekVals.length === 0 || Math.max(...weekVals) <= 0) {
    return <p className="font-body text-sm text-ink/50">Not enough data yet — keep logging and this fills in.</p>;
  }

  const W = 360;
  const H = 172;
  const padX = 6;
  const padT = 22;
  const padB = 24;
  const plotW = W - padX * 2;
  const plotH = H - padT - padB;
  const max = Math.max(...weekVals, target ?? 0) * 1.12 || 1;
  const y = (v: number) => padT + (1 - v / max) * plotH;
  const baseY = padT + plotH;

  const n = weeks.length;
  const slot = plotW / Math.max(1, n);
  const barW = Math.min(46, slot * 0.66);
  const r = Math.min(barW / 2, 8);

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel} className="block">
        {target != null ? (
          <>
            <line x1={padX} x2={W - padX} y1={y(target)} y2={y(target)} stroke="#e10600" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.55} vectorEffect="non-scaling-stroke" />
            <text x={W - padX} y={y(target) - 4} textAnchor="end" className="fill-red/80" style={{ font: "700 8.5px sans-serif" }}>
              {targetLabel} {formatValue(target)}
            </text>
          </>
        ) : null}
        {weeks.map((w, i) => {
          const cx = padX + slot * i + slot / 2;
          const x = cx - barW / 2;
          // Empty/zero week → just the date, no bar.
          if (w.value == null || w.value <= 0) {
            return <text key={i} x={cx} y={H - 6} textAnchor="middle" className="fill-ink/45" style={{ font: "600 8.5px sans-serif" }}>{w.label}</text>;
          }
          const top = y(w.value);
          const hit = target != null && w.value >= target * 0.95;
          const fill = hit ? goodColor : color;
          return (
            <g key={i}>
              {/* faint full-height track */}
              <rect x={x} y={padT} width={barW} height={plotH} rx={r} className="fill-hairline" opacity={0.35} />
              {/* the bar */}
              <rect x={x} y={top} width={barW} height={Math.max(r, baseY - top)} rx={r} fill={fill} />
              {/* value on top */}
              <text x={cx} y={top - 6} textAnchor="middle" className="fill-ink" style={{ font: "800 10px sans-serif" }}>{formatValue(w.value)}</text>
              {/* week label */}
              <text x={cx} y={H - 6} textAnchor="middle" className="fill-ink/45" style={{ font: "600 8.5px sans-serif" }}>{w.label}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
