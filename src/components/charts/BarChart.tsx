import type { SeriesPoint } from "@/lib/charts/series";

/**
 * Flat bar chart (§4) for daily food logging or consistency. Server-rendered
 * SVG. A fixed `max` (e.g. 1 for %, or target×N) keeps the axis stable so days
 * are comparable; an optional dashed target line reads at a glance.
 */
export function BarChart({
  points,
  height = 120,
  max,
  targetLine = null,
  color = "#0c0c0d",
  overColor = "#e10600",
  ariaLabel,
  formatValue = (n) => String(Math.round(n)),
}: {
  points: SeriesPoint[];
  height?: number;
  max?: number;
  targetLine?: number | null;
  color?: string;
  overColor?: string;
  ariaLabel: string;
  formatValue?: (n: number) => string;
}) {
  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  if (values.length === 0) {
    return <p className="font-body text-sm text-ink/50">Nothing logged in this window yet.</p>;
  }

  const W = 320;
  const H = height;
  const top = Math.max(max ?? 0, ...values, targetLine ?? 0) || 1;
  const n = points.length;
  const gap = n > 40 ? 1 : 2;
  const bw = W / n;
  const y = (v: number) => H - (v / top) * H;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={ariaLabel} preserveAspectRatio="none">
        {points.map((p, i) => {
          if (p.value == null || p.value <= 0) return null;
          const over = targetLine != null && p.value > targetLine * 1.05;
          const barH = Math.max(1, H - y(p.value));
          return (
            <rect
              key={p.date}
              x={i * bw + gap / 2}
              y={H - barH}
              width={Math.max(0.5, bw - gap)}
              height={barH}
              fill={over ? overColor : color}
              opacity={over ? 0.85 : 0.75}
            >
              <title>{`${p.date}: ${formatValue(p.value)}`}</title>
            </rect>
          );
        })}
        {targetLine != null ? (
          <line x1={0} x2={W} y1={y(targetLine)} y2={y(targetLine)} stroke="#e10600" strokeWidth={1} strokeDasharray="4 4" opacity={0.6} vectorEffect="non-scaling-stroke" />
        ) : null}
      </svg>
    </figure>
  );
}
