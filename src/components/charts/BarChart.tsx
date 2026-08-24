import type { WeekPoint } from "@/lib/charts/series";

/**
 * Flat weekly-average bar chart (§4 — no gradients, high contrast). Server SVG,
 * zero client JS. Bars carry a value label on top, a labeled target line, and a
 * week-start label under each bar — the trend a coach reads at a glance. Bars
 * that meet the target read green; the rest read neutral (or red for an "under
 * the cap" limit chart, when `lowerIsBetter`).
 */
export function BarChart({
  weeks,
  target = null,
  targetLabel = "target",
  color = "#f4f4f2",
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
  const vals = [...weekVals, ...(target != null ? [target] : [])];
  // Nothing logged in any week → an honest empty state, not a row of "0" bars.
  if (weekVals.length === 0 || Math.max(...weekVals) <= 0) {
    return <p className="font-body text-sm text-ink/50">Not enough data yet — keep logging and this fills in.</p>;
  }

  const W = 360;
  const H = 180;
  const padL = 8;
  const padR = 8;
  const padT = 18;
  const padB = 22;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const max = Math.max(...vals) * 1.15 || 1;
  const y = (v: number) => padT + (1 - v / max) * plotH;

  const n = weeks.length;
  const slot = plotW / Math.max(1, n);
  const barW = Math.min(38, slot * 0.62);

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel} className="block">
        {/* baseline */}
        <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="#2c2c31" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {target != null ? (
          <>
            <line x1={padL} x2={W - padR} y1={y(target)} y2={y(target)} stroke="#e10600" strokeWidth={1.25} strokeDasharray="4 3" opacity={0.7} vectorEffect="non-scaling-stroke" />
            <text x={W - padR} y={y(target) - 3} textAnchor="end" className="fill-red" style={{ font: "600 8px sans-serif" }}>
              {targetLabel} {formatValue(target)}
            </text>
          </>
        ) : null}
        {weeks.map((w, i) => {
          const cx = padL + slot * i + slot / 2;
          // No data (or a genuine zero) → just the week label, no bar or "0" stamp.
          if (w.value == null || w.value <= 0) {
            return (
              <text key={i} x={cx} y={H - 7} textAnchor="middle" className="fill-ink/40" style={{ font: "500 8px sans-serif" }}>{w.label}</text>
            );
          }
          const top = y(w.value);
          const h = padT + plotH - top;
          const hit = target != null && w.value >= target * 0.95;
          return (
            <g key={i}>
              <rect x={cx - barW / 2} y={top} width={barW} height={Math.max(1, h)} fill={hit ? goodColor : color} opacity={hit ? 0.9 : 0.55} rx={1.5} />
              <text x={cx} y={top - 4} textAnchor="middle" className="fill-ink/70" style={{ font: "600 8.5px sans-serif" }}>{formatValue(w.value)}</text>
              <text x={cx} y={H - 7} textAnchor="middle" className="fill-ink/40" style={{ font: "500 8px sans-serif" }}>{w.label}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
