import type { WeekPoint } from "@/lib/charts/series";

/**
 * Clean, bold bar chart (§4 — flat, high-contrast, no gradients). One chunky
 * rounded bar per period, a bold value on top, the period label under it, and an
 * optional dashed target line. A period with no data shows just its label (no
 * bar) — so sparse data reads as "nothing logged", never as a broken chart.
 *
 * Width is capped and centred so a handful of weekly bars stay grouped and
 * chunky instead of stretching thin across a wide coach column. Server SVG.
 */
export function BarChart({
  weeks,
  target = null,
  targetLabel = "target",
  color = "#e10600",
  ariaLabel,
  formatValue = (n) => String(Math.round(n)),
}: {
  weeks: WeekPoint[];
  target?: number | null;
  targetLabel?: string;
  color?: string;
  ariaLabel: string;
  formatValue?: (n: number) => string;
}) {
  const vals = weeks.map((w) => w.value).filter((v): v is number => v != null);
  if (vals.length === 0 || Math.max(...vals) <= 0) {
    return <p className="font-body text-sm text-ink/50">Not enough data yet — keep logging and this fills in.</p>;
  }

  const W = 380;
  const H = 208;
  const padX = 8;
  const padT = 26; // headroom for value labels
  const padB = 26; // room for period labels
  const plotW = W - padX * 2;
  const plotH = H - padT - padB;
  const max = Math.max(...vals, target ?? 0) * 1.15 || 1;
  const y = (v: number) => padT + (1 - v / max) * plotH;
  const baseY = padT + plotH;

  const n = weeks.length;
  const slot = plotW / Math.max(1, n);
  const barW = Math.max(6, Math.min(56, slot * 0.62));
  const r = Math.min(barW / 2, 7);
  // Show a period label on every bar when few; thin out when many so they don't collide.
  const labelEvery = n <= 8 ? 1 : Math.ceil(n / 7);

  return (
    <figure className="mx-auto m-0 w-full max-w-[440px]">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel} className="block">
        {/* baseline */}
        <line x1={padX} x2={W - padX} y1={baseY} y2={baseY} stroke="#2c2c31" strokeWidth={1} vectorEffect="non-scaling-stroke" />

        {/* target reference */}
        {target != null ? (
          <>
            <line x1={padX} x2={W - padX} y1={y(target)} y2={y(target)} stroke="#e10600" strokeWidth={1.25} strokeDasharray="4 3" opacity={0.7} vectorEffect="non-scaling-stroke" />
            <text x={W - padX} y={y(target) - 4} textAnchor="end" className="fill-red" style={{ font: "700 8.5px sans-serif" }}>
              {targetLabel} {formatValue(target)}
            </text>
          </>
        ) : null}

        {weeks.map((w, i) => {
          const cx = padX + slot * i + slot / 2;
          const showLabel = i % labelEvery === 0 || i === n - 1;
          if (w.value == null || w.value <= 0) {
            return showLabel ? (
              <text key={i} x={cx} y={H - 7} textAnchor="middle" className="fill-ink/40" style={{ font: "600 9px sans-serif" }}>{w.label}</text>
            ) : null;
          }
          const top = y(w.value);
          const h = Math.max(r * 2, baseY - top);
          return (
            <g key={i}>
              <rect x={cx - barW / 2} y={baseY - h} width={barW} height={h} rx={r} fill={color} />
              {n <= 12 ? (
                <text x={cx} y={top - 7} textAnchor="middle" className="fill-ink" style={{ font: "800 10.5px sans-serif" }}>{formatValue(w.value)}</text>
              ) : null}
              {showLabel ? (
                <text x={cx} y={H - 7} textAnchor="middle" className="fill-ink/40" style={{ font: "600 9px sans-serif" }}>{w.label}</text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
