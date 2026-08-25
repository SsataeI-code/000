import type { SeriesPoint } from "@/lib/charts/series";

/**
 * Dot chart with a connecting trend line (§4 — flat, high-contrast, no
 * gradients). Every logged point gets a dot; a line connects consecutive points
 * in date order and BREAKS at gaps — no data, no line (a lone point keeps its
 * dot but grows no line). Server-rendered static SVG: zero client JS, crisp at
 * any width, readable text fallback. The latest point is emphasised so "now"
 * stands out.
 */
export function LineChart({
  points,
  color = "#f4f4f2",
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
  const values = [
    ...points.map((p) => p.value),
    ...(targetLine != null ? [targetLine] : []),
  ].filter((v): v is number => v != null);

  const loggedCount = points.filter((p) => p.value != null).length;
  if (values.length === 0 || loggedCount < 1) {
    return <p className="font-body text-sm text-ink/50">Not enough data yet — keep logging and this fills in.</p>;
  }

  // Layout (viewBox units). Left gutter for value labels, bottom for dates.
  const W = 360;
  const H = 190;
  const padL = 40;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const span = dataMax - dataMin || Math.abs(dataMax) || 1;
  // A little headroom so dots never touch the frame.
  const lo = dataMin - span * 0.1;
  const hi = dataMax + span * 0.1;
  const range = hi - lo || 1;

  const n = points.length;
  const x = (i: number) => (n === 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW);
  const y = (v: number) => padT + (1 - (v - lo) / range) * plotH;

  // One connecting line per contiguous run of logged points. A run of length 1
  // draws no line (just its dot) — "no points means no line", at the segment
  // level too.
  const linePaths: string[] = [];
  let run: { i: number; v: number }[] = [];
  const flush = () => {
    if (run.length >= 2) {
      let d = `M ${x(run[0].i).toFixed(1)} ${y(run[0].v).toFixed(1)}`;
      for (let k = 1; k < run.length; k++) d += ` L ${x(run[k].i).toFixed(1)} ${y(run[k].v).toFixed(1)}`;
      linePaths.push(d);
    }
    run = [];
  };
  points.forEach((p, i) => { if (p.value == null) flush(); else run.push({ i, v: p.value }); });
  flush();

  // 4 value gridlines, deduped by label so flat/zero data doesn't stack up
  // identical labels (which reads as broken).
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
    <figure className="mx-auto m-0 w-full max-w-[440px]">
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

        {/* Connecting trend line (one per contiguous run; gaps stay empty) */}
        {linePaths.map((d, i) => (
          <path key={`l${i}`} d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ))}

        {/* A dot on every logged point; the latest gets a bold halo */}
        {points.map((p, i) => {
          if (p.value == null) return null;
          const last = i === lastIdx;
          return (
            <g key={i}>
              {last ? <circle cx={x(i)} cy={y(p.value)} r={8} fill={color} opacity={0.18} /> : null}
              <circle cx={x(i)} cy={y(p.value)} r={last ? 4.5 : 3.25} fill={color} stroke="#0b0b0d" strokeWidth={1.25} />
            </g>
          );
        })}

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
