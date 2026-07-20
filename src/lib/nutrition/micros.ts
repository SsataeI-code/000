import type { FoodLog } from "@/lib/types/db";

/**
 * Micronutrient tracking (§5B "micros: any nutrient sliceable"; §6).
 *
 * Values follow Open Food Facts' per-100g convention: grams for everything
 * (so sodium 0.5 = 0.5 g = 500 mg). We store the full scaled map on each food
 * log, then convert to friendly units only for display.
 */

export interface MicroDef {
  key: string; // matches our normalized OFF key (the _100g suffix stripped)
  label: string;
  unit: "g" | "mg" | "mcg";
  factor: number; // multiply the stored (gram) value by this for display
  decimals: number;
}

/** The core micros surfaced in the daily summary. Full raw data is still stored. */
export const DISPLAY_MICROS: MicroDef[] = [
  { key: "fiber", label: "Fiber", unit: "g", factor: 1, decimals: 1 },
  { key: "sugars", label: "Sugars", unit: "g", factor: 1, decimals: 1 },
  { key: "saturated-fat", label: "Saturated fat", unit: "g", factor: 1, decimals: 1 },
  { key: "sodium", label: "Sodium", unit: "mg", factor: 1000, decimals: 0 },
  { key: "potassium", label: "Potassium", unit: "mg", factor: 1000, decimals: 0 },
  { key: "calcium", label: "Calcium", unit: "mg", factor: 1000, decimals: 0 },
  { key: "iron", label: "Iron", unit: "mg", factor: 1000, decimals: 1 },
];

/** Keys we DON'T repeat in the micro summary (they're the headline macros). */
const MACRO_KEYS = new Set(["energy_kcal", "energy-kcal", "proteins", "carbohydrates", "fat"]);

/** Scale a per-100g nutriment map to an absolute amount for `grams` eaten. */
export function scaleNutriments(
  per100g: Record<string, number> | null | undefined,
  grams: number,
): Record<string, number> {
  if (!per100g || !Number.isFinite(grams) || grams <= 0) return {};
  const factor = grams / 100;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(per100g)) {
    if (MACRO_KEYS.has(k)) continue; // macros live in their own columns
    if (typeof v === "number" && Number.isFinite(v)) {
      out[k] = Math.round(v * factor * 1000) / 1000;
    }
  }
  return out;
}

/** Sum the stored (already per-serving) micro maps across a day's logs. */
export function sumMicros(logs: FoodLog[]): Record<string, number> {
  const total: Record<string, number> = {};
  for (const log of logs) {
    const n = log.nutriments;
    if (!n || typeof n !== "object") continue;
    for (const [k, v] of Object.entries(n)) {
      if (typeof v === "number" && Number.isFinite(v)) {
        total[k] = (total[k] ?? 0) + v;
      }
    }
  }
  return total;
}

/** Format one micro total for display (value already in grams). */
export function formatMicro(def: MicroDef, gramsValue: number): string {
  const v = gramsValue * def.factor;
  return `${v.toFixed(def.decimals)} ${def.unit}`;
}

/** The display rows that actually have data today (skip micros we know nothing about). */
export function presentMicros(totals: Record<string, number>): Array<{ def: MicroDef; value: number }> {
  return DISPLAY_MICROS.filter((d) => totals[d.key] != null && totals[d.key] > 0).map((def) => ({
    def,
    value: totals[def.key],
  }));
}
