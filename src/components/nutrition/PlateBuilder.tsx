"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { logFoodAction, searchPlateFoodsAction, createMealAction } from "@/lib/food/actions";
import { FoodIcon } from "@/components/nutrition/FoodIcon";
import { allowedByDiet, type DietFilter } from "@/lib/food/diet";
import {
  PLATE_FOODS,
  PLATE_ZONES,
  ZONE_META,
  foodsByZone,
  selectedTotals,
  zoneCounts,
  plateBalanceHint,
  plateLogName,
  type PlateZone,
  type PlateFood,
} from "@/lib/nutrition/plate-foods";

/** Fraction-of-circle wedge path (0 = 12 o'clock, clockwise). */
function wedge(cx: number, cy: number, r: number, a: number, b: number): string {
  const pt = (frac: number) => {
    const ang = frac * 2 * Math.PI - Math.PI / 2;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  const [x0, y0] = pt(a);
  const [x1, y1] = pt(b);
  const large = b - a > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`;
}

// Where each zone sits on the reference plate (veggies = half, others = a quarter).
const ZONE_ARC: Record<Exclude<PlateZone, "fat">, [number, number]> = {
  protein: [0, 0.25],
  carb: [0.25, 0.5],
  veggie: [0.5, 1],
};

/**
 * Plate builder — build a plate from real foods. Tap the common foods or search
 * for anything you eat; adjust servings with +/−. Foods drop into a reference
 * plate that teaches the balanced-plate method (half veggies, a quarter protein,
 * a quarter carbs, a thumb of fats), and the macros build up live from each
 * food's real values. One tap logs the whole plate.
 */
export function PlateBuilder({
  targets,
  diet,
}: {
  targets: { calories: number; proteinG: number } | null;
  diet?: DietFilter;
}) {
  const [selected, setSelected] = useState<PlateFood[]>([]);
  const [logState, setLogState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlateFood[]>([]);
  const [searching, startSearch] = useTransition();
  const [mealName, setMealName] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Honor the client's diet + avoid list for the quick-pick palette.
  const palette = diet ? PLATE_FOODS.filter((f) => allowedByDiet(f.name, diet)) : PLATE_FOODS;

  const add = (food: PlateFood) => {
    setLogState("idle");
    setSaveState("idle");
    setSelected((s) => [...s, food]);
  };
  const removeOne = (id: string) => {
    setLogState("idle");
    setSaveState("idle");
    setSelected((s) => {
      const i = s.map((f) => f.id).lastIndexOf(id);
      if (i === -1) return s;
      return [...s.slice(0, i), ...s.slice(i + 1)];
    });
  };

  function runSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    startSearch(async () => {
      setResults(await searchPlateFoodsAction(q));
    });
  }

  const totals = selectedTotals(selected);
  const counts = zoneCounts(selected);
  const hint = plateBalanceHint(selected);
  const hasFood = selected.length > 0;

  // Group the selection for the summary list (by id, first-seen order).
  const grouped: { food: PlateFood; count: number }[] = [];
  const seen = new Map<string, number>();
  for (const f of selected) {
    if (seen.has(f.id)) grouped[seen.get(f.id)!].count += 1;
    else {
      seen.set(f.id, grouped.length);
      grouped.push({ food: f, count: 1 });
    }
  }

  async function logPlate() {
    if (!hasFood) return;
    setLogState("saving");
    const res = await logFoodAction({
      name: plateLogName(selected),
      calories: totals.calories,
      proteinG: totals.proteinG,
      carbsG: totals.carbsG,
      fatG: totals.fatG,
      source: "manual",
    });
    setLogState(res.ok ? "done" : "error");
  }

  // Save the built plate as a reusable meal. Each food's portion macros are
  // encoded as a 100 g item (per-100g × count) so re-logging round-trips exactly.
  async function saveMeal() {
    if (!hasFood || !mealName.trim()) return;
    setSaveState("saving");
    const items = grouped.map(({ food, count }) => ({
      name: food.name,
      grams: 100,
      nutrimentsPer100g: {
        energy_kcal: Math.round(food.calories * count),
        proteins: Math.round(food.proteinG * count * 10) / 10,
        carbohydrates: Math.round(food.carbsG * count * 10) / 10,
        fat: Math.round(food.fatG * count * 10) / 10,
      },
    }));
    const res = await createMealAction(mealName.trim(), items);
    setSaveState(res.ok ? "saved" : "error");
  }

  return (
    <section aria-label="Plate builder" className="flex flex-col gap-5 border border-hairline bg-surface p-5">
      <div>
        <h2 className="text-2xl text-ink">Build a plate</h2>
        <p className="mt-1 font-body text-sm text-ink/60">
          Tap common foods or search for anything you eat. Aim to fill half with veggies, a quarter with protein, a
          quarter with carbs, and a thumb of fats.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
        {/* The reference plate — fills in as foods are added, zone by zone. */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          <svg viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Your plate" className="shrink-0">
            <circle cx="100" cy="100" r="94" fill="#0c0c0d" stroke="#2c2c31" strokeWidth="3" />
            {(Object.keys(ZONE_ARC) as (keyof typeof ZONE_ARC)[]).map((zone) => {
              const [a, b] = ZONE_ARC[zone];
              const active = counts[zone] > 0;
              const meta = ZONE_META[zone];
              const mid = (a + b) / 2;
              const ang = mid * 2 * Math.PI - Math.PI / 2;
              const lx = 100 + 52 * Math.cos(ang);
              const ly = 100 + 52 * Math.sin(ang);
              return (
                <g key={zone}>
                  <path
                    d={wedge(100, 100, 90, a, b)}
                    fill={meta.color}
                    fillOpacity={active ? 0.9 : 0.12}
                    stroke="#0c0c0d"
                    strokeWidth="2"
                  />
                  <text x={lx} y={ly - 4} textAnchor="middle" className="fill-white" style={{ font: "700 11px sans-serif" }}>
                    {meta.label}
                  </text>
                  {active ? (
                    <text x={lx} y={ly + 10} textAnchor="middle" className="fill-white" style={{ font: "700 12px sans-serif" }}>
                      ×{counts[zone]}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
          {/* Fats — the side dish. */}
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full border-2"
              style={{ borderColor: ZONE_META.fat.color, background: counts.fat > 0 ? ZONE_META.fat.color : "transparent" }}
            >
              <FoodIcon name="drop" size={16} />
            </span>
            <span className="font-body text-xs text-ink/60">
              Fats {counts.fat > 0 ? `×${counts.fat}` : "· on the side"}
            </span>
          </div>
        </div>

        {/* Live stats */}
        <div className="flex w-full flex-col gap-3">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Cal", value: totals.calories },
              { label: "Protein", value: `${totals.proteinG}g` },
              { label: "Carbs", value: `${totals.carbsG}g` },
              { label: "Fat", value: `${totals.fatG}g` },
            ].map((s) => (
              <div key={s.label} className="border border-hairline bg-surface-muted py-2">
                <p className="font-display text-2xl text-ink">{s.value}</p>
                <p className="font-label text-[10px] uppercase tracking-wide text-ink/50">{s.label}</p>
              </div>
            ))}
          </div>
          {targets ? (
            <p className="font-body text-xs text-ink/50">
              Your day: about {targets.calories.toLocaleString()} cal · {targets.proteinG}g protein — this plate is ~
              {targets.calories > 0 ? Math.round((totals.calories / targets.calories) * 100) : 0}% of your calories
              {targets.proteinG > 0 ? `, ${Math.round((totals.proteinG / targets.proteinG) * 100)}% of your protein` : ""}.
            </p>
          ) : null}
          {hint ? (
            <p className="border border-hairline bg-surface-muted px-3 py-2 font-body text-xs text-ink/70">{hint}</p>
          ) : (
            <p className="border border-success bg-surface px-3 py-2 font-body text-xs text-success">Nicely balanced plate — half veggies, protein and carbs in place.</p>
          )}
        </div>
      </div>

      {/* What's on the plate — adjust servings with +/− */}
      {grouped.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-hairline pt-3">
          <p className="font-label text-[11px] uppercase tracking-wide text-ink/50">On your plate</p>
          <ul className="flex flex-col gap-1.5">
            {grouped.map(({ food, count }) => (
              <li key={food.id} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-hairline bg-surface-muted">
                  <FoodIcon name={food.icon} size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-body text-sm text-ink">{food.name}</span>
                  <span className="block font-body text-[11px] text-ink/50">
                    {food.portion} · {food.calories * count} cal · {food.proteinG * count}p · {food.carbsG * count}c · {food.fatG * count}f
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => removeOne(food.id)}
                    aria-label={`Remove one ${food.name}`}
                    className="flex h-9 min-h-tap w-9 min-w-tap items-center justify-center border border-hairline text-lg text-ink/70 hover:border-red hover:text-red"
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-display text-lg text-ink">{count}</span>
                  <button
                    type="button"
                    onClick={() => add(food)}
                    aria-label={`Add another ${food.name}`}
                    className="flex h-9 min-h-tap w-9 min-w-tap items-center justify-center border border-hairline text-lg text-ink/70 hover:border-red hover:text-red"
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Search any food */}
      <div className="flex flex-col gap-2 border-t border-hairline pt-4">
        <p className="font-label text-xs uppercase tracking-wide text-ink">Add any food</p>
        <div className="flex items-end gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
            placeholder="Search foods… (e.g. salmon, oatmeal, avocado)"
            aria-label="Search foods to add to the plate"
            className="min-h-tap flex-1 border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink placeholder:text-ink/40 focus:border-ink"
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={searching || query.trim().length < 2}
            className="min-h-tap shrink-0 border border-hairline bg-surface px-4 py-2.5 font-label text-xs uppercase tracking-wide text-ink hover:border-red disabled:opacity-40"
          >
            {searching ? "…" : "Search"}
          </button>
        </div>
        {results.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {results.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => add(food)}
                aria-label={`Add ${food.name}, ${food.portion}, ${food.calories} calories`}
                className="flex min-h-tap items-center gap-2 border border-hairline bg-surface px-2.5 py-1.5 text-left hover:border-red"
              >
                <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ZONE_META[food.zone].color }} />
                <span className="min-w-0">
                  <span className="block font-body text-sm text-ink">{food.name}</span>
                  <span className="block font-body text-[10px] text-ink/45">{ZONE_META[food.zone].label} · {food.portion} · {food.calories} cal</span>
                </span>
              </button>
            ))}
          </div>
        ) : query.trim().length >= 2 && !searching ? (
          <p className="font-body text-xs text-ink/40">Press Search to find “{query.trim()}”.</p>
        ) : null}
      </div>

      {/* Quick-pick palette, grouped by zone */}
      <div className="flex flex-col gap-4 border-t border-hairline pt-4">
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Common foods</p>
        {PLATE_ZONES.map((zone) => {
          const foods = foodsByZone(zone, palette);
          if (foods.length === 0) return null;
          const meta = ZONE_META[zone];
          return (
            <div key={zone} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span aria-hidden className="h-3 w-3 rounded-sm" style={{ backgroundColor: meta.color }} />
                <span className="font-label text-xs uppercase tracking-wide text-ink">{meta.label}</span>
                <span className="font-body text-[11px] text-ink/45">{meta.aim}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {foods.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => add(food)}
                    aria-label={`Add ${food.name}, ${food.portion}, ${food.calories} calories`}
                    className="flex min-h-tap items-center gap-2 border border-hairline bg-surface px-2.5 py-1.5 text-left hover:border-red"
                  >
                    <FoodIcon name={food.icon} size={22} className="shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-body text-sm text-ink">{food.name}</span>
                      <span className="block font-body text-[10px] text-ink/45">{food.portion} · {food.calories} cal</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {logState === "done" ? (
        <p role="status" className="flex items-center justify-between gap-3 border border-success bg-surface px-3 py-2 text-sm text-success">
          Added to today&apos;s food log.
          <Link href="/client" className="font-label text-[10px] uppercase tracking-wide underline underline-offset-4">
            View today →
          </Link>
        </p>
      ) : null}
      {logState === "error" ? (
        <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">
          Couldn&apos;t log that — try again.
        </p>
      ) : null}

      {/* Save the plate as a reusable meal */}
      {hasFood ? (
        <div className="flex flex-col gap-2 border-t border-hairline pt-3">
          <p className="font-label text-[11px] uppercase tracking-wide text-ink/50">Save as a meal</p>
          <div className="flex items-end gap-2">
            <input
              value={mealName}
              onChange={(e) => {
                setMealName(e.target.value);
                setSaveState("idle");
              }}
              placeholder="Name it (e.g. My go-to bowl)"
              aria-label="Meal name"
              className="min-h-tap flex-1 border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink placeholder:text-ink/40 focus:border-ink"
            />
            <button
              type="button"
              onClick={saveMeal}
              disabled={!mealName.trim() || saveState === "saving" || saveState === "saved"}
              className="min-h-tap shrink-0 border border-ink px-4 py-2.5 font-label text-xs uppercase tracking-wide text-ink hover:border-red hover:text-red disabled:opacity-40"
            >
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Save meal"}
            </button>
          </div>
          {saveState === "saved" ? (
            <p role="status" className="font-body text-xs text-success">
              Saved to Your meals — log it in one tap anytime.
            </p>
          ) : null}
          {saveState === "error" ? (
            <p role="alert" className="font-body text-xs text-red-ink">Couldn&apos;t save that — try again.</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={logPlate}
          disabled={!hasFood || logState === "saving"}
          className="min-h-tap bg-red px-5 py-2 font-label text-xs font-600 uppercase tracking-wide text-white hover:bg-red-ink disabled:opacity-40"
        >
          {logState === "saving" ? "Logging…" : "Log this plate"}
        </button>
        <button
          type="button"
          onClick={() => {
            setSelected([]);
            setLogState("idle");
            setSaveState("idle");
            setMealName("");
          }}
          disabled={!hasFood}
          className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red disabled:opacity-40"
        >
          Clear
        </button>
      </div>
      <p className="font-body text-xs text-ink/40">
        Portions are an estimate — logging saves these approximate macros to today.
      </p>
    </section>
  );
}
