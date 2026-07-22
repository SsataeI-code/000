import type { SeriesPoint } from "@/lib/charts/series";

/**
 * Flat editorial line chart (§4 — no gradients, high contrast). Server-rendered
 * static SVG: zero client JS, crisp at any width, and it degrades to an
 * accessible text summary for screen readers. Nulls become gaps, not zeros.
 */
export function LineChart({
  points,
  overlay,
  height = 120,
  color = "#0c0c0d",
  overlayColor = "#e10600",
  targetLine = null,
  ariaLabel,
  formatValue = (n) => String(Math.round(n)),
}: {
  points: SeriesPoint[];
  overlay?: SeriesPoint[];
  height?: number;
  color?: string;
  overlayColor?: string;
  targetLine?: number | null;
  ariaLabel: string;
  formatValue?: (n: number) => string;
}) {
  const W = 320;
  const H = height;
  const padY = 12;
  const values = [
    ...points.map((p) => p.value),
    ...(overlay ?? []).map((p) => p.value),
    ...(targetLine != null ? [targetLine] : []),
  ].filter((v): v is number => v != null);

  if (values.length === 0 || points.length < 2) {
    return <p className="font-body text-sm text-ink/50">Not enough data yet — keep logging and this fills in.</p>;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const n = points.length;
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => H - padY - ((v - min) / range) * (H - padY * 2);

  const toPath = (series: SeriesPoint[]): string => {
    let d = "";
    let pen = false;
    series.forEach((p, i) => {
      if (p.value == null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };

  const last = [...points].reverse().find((p) => p.value != null)?.value ?? null;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={ariaLabel} preserveAspectRatio="none">
        {targetLine != null ? (
          <line x1={0} x2={W} y1={y(targetLine)} y2={y(targetLine)} stroke="#e10600" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} vectorEffect="non-scaling-stroke" />
        ) : null}
        {overlay ? (
          <path d={toPath(overlay)} fill="none" stroke={overlayColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ) : null}
        <path d={toPath(points)} fill="none" stroke={color} strokeWidth={overlay ? 1.25 : 2} strokeLinejoin="round" strokeLinecap="round" opacity={overlay ? 0.45 : 1} vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="mt-1 flex justify-between font-label text-[10px] uppercase tracking-wide text-ink/40">
        <span>{formatValue(min)}</span>
        {last != null ? <span className="text-ink/60">now {formatValue(last)}</span> : null}
        <span>{formatValue(max)}</span>
      </figcaption>
    </figure>
  );
}
