"use client";

import { useState } from "react";
import { plateTotals, EMPTY_PLATE, type PlateCounts } from "@/lib/nutrition/plate";

type Cat = { key: keyof PlateCounts; label: string; hand: string; color: string; note: string };

// Flat chart colors (raw-hex leaf visuals, per house style) — no gradients.
const CATS: Cat[] = [
  { key: "fists", label: "Veggies", hand: "fists", color: "#34c759", note: "fill half your plate" },
  { key: "palms", label: "Protein", hand: "palms", color: "#e10600", note: "a palm each" },
  { key: "cupped", label: "Carbs", hand: "cupped hands", color: "#c9a227", note: "a cupped hand" },
  { key: "thumbs", label: "Fats", hand: "thumbs", color: "#7f8fa6", note: "a thumb" },
];

function slice(cx: number, cy: number, r: number, a: number, b: number): string {
  const p = (frac: number) => {
    const ang = frac * 2 * Math.PI - Math.PI / 2;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  const [x0, y0] = p(a);
  const [x1, y1] = p(b);
  const large = b - a > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
}

/**
 * Interactive plate builder (teaching tool). Tap portions on; the plate fills by
 * volume (so veggies visibly take up half) and the macros/calories update live —
 * clients learn what a balanced plate looks like without weighing anything.
 */
export function PlateBuilder({ targets }: { targets: { calories: number; proteinG: number } | null }) {
  const [counts, setCounts] = useState<PlateCounts>(EMPTY_PLATE);
  const bump = (k: keyof PlateCounts, d: number) =>
    setCounts((c) => ({ ...c, [k]: Math.max(0, Math.min(12, c[k] + d)) }));

  const totals = plateTotals(counts);
  const totalPortions = counts.palms + counts.cupped + counts.thumbs + counts.fists;

  // Wedge sizes by portion count (volume) so the plate teaches proportions.
  let acc = 0;
  const wedges = CATS.map((cat) => {
    const share = totalPortions > 0 ? counts[cat.key] / totalPortions : 0;
    const start = acc;
    acc += share;
    return { cat, start, end: acc, share };
  });

  return (
    <section aria-label="Plate builder" className="flex flex-col gap-4 border border-hairline bg-surface p-5">
      <div>
        <h2 className="text-2xl text-ink">Build a plate</h2>
        <p className="mt-1 font-body text-sm text-ink/60">
          Tap to add hand portions and watch your plate fill up. Aim for half veggies, a palm of protein, a cupped hand
          of carbs, a thumb of fats.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-6">
        {/* The plate */}
        <svg viewBox="0 0 120 120" width="180" height="180" role="img" aria-label="Your plate" className="shrink-0">
          <circle cx="60" cy="60" r="56" fill="#0c0c0d" stroke="#2c2c31" strokeWidth="3" />
          {totalPortions === 0 ? (
            <text x="60" y="64" textAnchor="middle" className="fill-ink/40" style={{ font: "600 8px sans-serif" }}>
              Empty plate
            </text>
          ) : (
            wedges
              .filter((w) => w.share > 0)
              .map((w) => <path key={w.cat.key} d={slice(60, 60, 54, w.start, w.end)} fill={w.cat.color} stroke="#0c0c0d" strokeWidth="1" />)
          )}
        </svg>

        {/* Controls */}
        <ul className="flex w-full flex-col gap-2">
          {CATS.map((cat) => (
            <li key={cat.key} className="flex items-center gap-3">
              <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: cat.color }} />
              <span className="min-w-0 flex-1">
                <span className="block font-body text-sm text-ink">{cat.label}</span>
                <span className="block font-body text-[11px] text-ink/50">{cat.note}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Remove a ${cat.label} portion`}
                  onClick={() => bump(cat.key, -1)}
                  disabled={counts[cat.key] === 0}
                  className="flex h-11 w-11 items-center justify-center border border-hairline text-xl text-ink disabled:opacity-30 hover:border-red"
                >
                  −
                </button>
                <span className="w-6 text-center font-display text-2xl text-ink">{counts[cat.key]}</span>
                <button
                  type="button"
                  aria-label={`Add a ${cat.label} portion`}
                  onClick={() => bump(cat.key, 1)}
                  className="flex h-11 w-11 items-center justify-center border border-hairline text-xl text-ink hover:border-red"
                >
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-4 gap-2 border-t border-hairline pt-3 text-center">
        {[
          { label: "Cal", value: totals.calories },
          { label: "Protein", value: `${totals.proteinG}g` },
          { label: "Carbs", value: `${totals.carbsG}g` },
          { label: "Fat", value: `${totals.fatG}g` },
        ].map((s) => (
          <div key={s.label}>
            <p className="font-display text-2xl text-ink">{s.value}</p>
            <p className="font-label text-[10px] uppercase tracking-wide text-ink/50">{s.label}</p>
          </div>
        ))}
      </div>

      {targets ? (
        <p className="font-body text-xs text-ink/50">
          Your day: about {targets.calories} cal · {targets.proteinG}g protein. This plate is ~
          {targets.calories > 0 ? Math.round((totals.calories / targets.calories) * 100) : 0}% of your calories.
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <p className="font-body text-xs text-ink/40">A learning estimate — not a food log.</p>
        <button
          type="button"
          onClick={() => setCounts(EMPTY_PLATE)}
          disabled={totalPortions === 0}
          className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </section>
  );
}
