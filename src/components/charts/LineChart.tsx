import type { SeriesPoint } from "@/lib/charts/series";

/**
 * Flat editorial line chart (§4 — no gradients, high contrast). Server-rendered
 * static SVG: zero client JS, crisp at any width, accessible text fallback.
 * Readable by design — real (undistorted) aspect ratio, y-axis value gridlines,
 * start/end date labels, and dots on every logged point so sparse data still
 * reads. Nulls become gaps, not zeros.
 */
export function LineChart({
  points,
  overlay,
  color = "#f4f4f2",
  overlayColor = "#e10600",
  targetLine = null,
  targetLabel = "target",
  ariaLabel,
  formatValue = (n) => String(Math.round(n)),
}: {
  points: SeriesPoint[];
  overlay?: SeriesPoint[];
  color?: string;
  overlayColor?: string;
  targetLine?: number | null;
  targetLabel?: string;
  ariaLabel: string;
  formatValue?: (n: number) => string;
}) {
  const values = [
    ...points.map((p) => p.value),
    ...(overlay ?? []).map((p) => p.value),
    ...(targetLine != null ? [targetLine] : []),
  ].filter((v): v is number => v != null);

  if (values.length === 0 || points.filter((p) => p.value != null).length < 2) {
    return <p className="font-body text-sm text-ink/50">Not enough data yet — keep logging and this fills in.</p>;
  }

  // Layout (viewBox units). Left gutter for value labels, bottom for dates.
  const W = 360;
  const H = 190;
  const padL = 40;
  const padR = 12;
  const padT = 12;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const span = dataMax - dataMin || Math.abs(dataMax) || 1;
  // A little headroom so the line never touches the frame.
  const lo = dataMin - span * 0.08;
  const hi = dataMax + span * 0.08;
  const range = hi - lo || 1;

  const n = points.length;
  const x = (i: number) => (n === 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW);
  const y = (v: number) => padT + (1 - (v - lo) / range) * plotH;

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

  // 4 value gridlines across the range — deduped by label so flat/zero data
  // doesn't stack up identical "0" labels (which reads as broken).
  const seenLabels = new Set<string>();
  const ticks = [0, 1, 2, 3]
    .map((k) => lo + (range * k) / 3)
    .filter((t) => {
      const label = formatValue(t);
      if (seenLabels.has(label)) return false;
      seenLabels.add(label);
      return true;
    });

  const fmtDate = (iso: string) => {
    const d = new Date(`${iso}T00:00:00Z`);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  };
  const firstDate = points.find((p) => p.value != null)?.date ?? points[0]?.date;
  let lastIdx = 0;
  points.forEach((p, i) => { if (p.value != null) lastIdx = i; });
  const lastPoint = points[lastIdx];
  const midIdx = Math.floor((n - 1) / 2);

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel} className="block">
        {/* Value gridlines + labels */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#2c2c31" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" className="fill-ink/40" style={{ font: "500 9px sans-serif" }}>
              {formatValue(t)}
            </text>
          </g>
        ))}

        {/* Target line */}
        {targetLine != null ? (
          <>
            <line x1={padL} x2={W - padR} y1={y(targetLine)} y2={y(targetLine)} stroke="#e10600" strokeWidth={1.25} strokeDasharray="4 3" opacity={0.7} vectorEffect="non-scaling-stroke" />
            <text x={W - padR} y={y(targetLine) - 3} textAnchor="end" className="fill-red" style={{ font: "600 8px sans-serif" }}>
              {targetLabel} {formatValue(targetLine)}
            </text>
          </>
        ) : null}

        {/* Trend overlay (smoothed) */}
        {overlay ? (
          <path d={toPath(overlay)} fill="none" stroke={overlayColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ) : null}

        {/* Main series */}
        <path d={toPath(points)} fill="none" stroke={color} strokeWidth={overlay ? 1.25 : 2} strokeLinejoin="round" strokeLinecap="round" opacity={overlay ? 0.55 : 1} vectorEffect="non-scaling-stroke" />

        {/* Dots on logged points */}
        {points.map((p, i) =>
          p.value == null ? null : (
            <circle key={i} cx={x(i)} cy={y(p.value)} r={i === lastIdx ? 3.2 : 1.8} fill={i === lastIdx ? overlayColor : color} />
          ),
        )}

        {/* Date axis */}
        {firstDate ? <text x={padL} y={H - 8} textAnchor="start" className="fill-ink/40" style={{ font: "500 9px sans-serif" }}>{fmtDate(firstDate)}</text> : null}
        {n > 4 && points[midIdx]?.date ? <text x={padL + plotW / 2} y={H - 8} textAnchor="middle" className="fill-ink/40" style={{ font: "500 9px sans-serif" }}>{fmtDate(points[midIdx].date)}</text> : null}
        {lastPoint?.date ? <text x={W - padR} y={H - 8} textAnchor="end" className="fill-ink/40" style={{ font: "500 9px sans-serif" }}>{fmtDate(lastPoint.date)}</text> : null}
      </svg>
      {lastPoint?.value != null ? (
        <figcaption className="mt-1 text-right font-label text-[10px] uppercase tracking-wide text-ink/50">
          now {formatValue(lastPoint.value)}
        </figcaption>
      ) : null}
    </figure>
  );
}
