import type { FoodLog, Sex } from "@/lib/types/db";

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

// ---------------------------------------------------------------------------
// Essential micronutrient GOALS (§5B) — the full vitamin + mineral panel.
// ---------------------------------------------------------------------------

export type MicroGroup = "Vitamins" | "Minerals" | "Limits";

export interface EssentialMicro {
  key: string; // normalized OFF key
  label: string;
  unit: "g" | "mg" | "mcg";
  factor: number; // grams (stored) -> display unit
  group: MicroGroup;
  /**
   * How the daily goal is set:
   *  - number         : a fixed Daily Value in the display unit (the 2000-cal std)
   *  - {female,male}  : sex-specific fixed DV
   *  - "fiberFromCal" : 14 g per 1000 kcal (scales with the calorie target)
   *  - "satFatCap"    : <10% of calories (a cap)
   *  - "sugarCap"     : <10% of calories, as added-sugar proxy (a cap)
   */
  dv: number | { female: number; male: number } | "fiberFromCal" | "satFatCap" | "sugarCap";
  /** A limit is a ceiling to stay under; a goal is a floor to reach. */
  kind: "goal" | "limit";
}

/**
 * Daily Values from the FDA 2,000-calorie reference (adults). Vitamins/minerals
 * are fixed floors that DON'T shrink with a lower calorie target — so a client
 * eating less still aims for the full amount (they just need denser food). The
 * calorie-linked entries (fiber, and the sat-fat/sugar caps) scale to the
 * client's own target.
 */
export const ESSENTIAL_MICROS: EssentialMicro[] = [
  // Vitamins
  { key: "vitamin-a", label: "Vitamin A", unit: "mcg", factor: 1_000_000, group: "Vitamins", dv: 900, kind: "goal" },
  { key: "vitamin-c", label: "Vitamin C", unit: "mg", factor: 1000, group: "Vitamins", dv: 90, kind: "goal" },
  { key: "vitamin-d", label: "Vitamin D", unit: "mcg", factor: 1_000_000, group: "Vitamins", dv: 20, kind: "goal" },
  { key: "vitamin-e", label: "Vitamin E", unit: "mg", factor: 1000, group: "Vitamins", dv: 15, kind: "goal" },
  { key: "vitamin-k", label: "Vitamin K", unit: "mcg", factor: 1_000_000, group: "Vitamins", dv: 120, kind: "goal" },
  { key: "vitamin-b1", label: "Thiamin (B1)", unit: "mg", factor: 1000, group: "Vitamins", dv: 1.2, kind: "goal" },
  { key: "vitamin-b2", label: "Riboflavin (B2)", unit: "mg", factor: 1000, group: "Vitamins", dv: 1.3, kind: "goal" },
  { key: "vitamin-pp", label: "Niacin (B3)", unit: "mg", factor: 1000, group: "Vitamins", dv: 16, kind: "goal" },
  { key: "vitamin-b6", label: "Vitamin B6", unit: "mg", factor: 1000, group: "Vitamins", dv: 1.7, kind: "goal" },
  { key: "vitamin-b9", label: "Folate (B9)", unit: "mcg", factor: 1_000_000, group: "Vitamins", dv: 400, kind: "goal" },
  { key: "vitamin-b12", label: "Vitamin B12", unit: "mcg", factor: 1_000_000, group: "Vitamins", dv: 2.4, kind: "goal" },
  // Minerals
  { key: "calcium", label: "Calcium", unit: "mg", factor: 1000, group: "Minerals", dv: 1300, kind: "goal" },
  { key: "iron", label: "Iron", unit: "mg", factor: 1000, group: "Minerals", dv: { female: 18, male: 8 }, kind: "goal" },
  { key: "magnesium", label: "Magnesium", unit: "mg", factor: 1000, group: "Minerals", dv: 420, kind: "goal" },
  { key: "zinc", label: "Zinc", unit: "mg", factor: 1000, group: "Minerals", dv: 11, kind: "goal" },
  { key: "potassium", label: "Potassium", unit: "mg", factor: 1000, group: "Minerals", dv: 4700, kind: "goal" },
  { key: "phosphorus", label: "Phosphorus", unit: "mg", factor: 1000, group: "Minerals", dv: 1250, kind: "goal" },
  { key: "copper", label: "Copper", unit: "mg", factor: 1000, group: "Minerals", dv: 0.9, kind: "goal" },
  { key: "selenium", label: "Selenium", unit: "mcg", factor: 1_000_000, group: "Minerals", dv: 55, kind: "goal" },
  { key: "fiber", label: "Fiber", unit: "g", factor: 1, group: "Minerals", dv: "fiberFromCal", kind: "goal" },
  // Limits (stay under)
  { key: "sodium", label: "Sodium", unit: "mg", factor: 1000, group: "Limits", dv: 2300, kind: "limit" },
  { key: "saturated-fat", label: "Saturated fat", unit: "g", factor: 1, group: "Limits", dv: "satFatCap", kind: "limit" },
  { key: "sugars", label: "Sugars", unit: "g", factor: 1, group: "Limits", dv: "sugarCap", kind: "limit" },
  { key: "cholesterol", label: "Cholesterol", unit: "mg", factor: 1000, group: "Limits", dv: 300, kind: "limit" },
];

export interface MicroGoalRow {
  def: EssentialMicro;
  /** Goal/limit in the display unit. */
  goal: number;
  /** Consumed so far in the display unit. */
  consumed: number;
  kind: "goal" | "limit";
}

/** Resolve one entry's numeric goal (in display unit) for this client. */
function resolveGoal(dv: EssentialMicro["dv"], calories: number, sex: Sex | null): number {
  if (typeof dv === "number") return dv;
  if (dv === "fiberFromCal") return Math.round((14 * calories) / 1000);
  if (dv === "satFatCap") return Math.round((0.1 * calories) / 9); // 10% of cals, g
  if (dv === "sugarCap") return Math.round((0.1 * calories) / 4); // 10% of cals, g
  return sex === "male" ? dv.male : dv.female; // sex-specific; default to female (higher iron)
}

/**
 * Build the full essential-micro tracker for a client: each vitamin/mineral with
 * its goal and today's consumed amount (both in display units). Consumed is 0
 * for nutrients we have no food data on yet — the goals still show, so the
 * target is always visible.
 */
export function buildMicroGoals(
  totalsGrams: Record<string, number>,
  calories: number,
  sex: Sex | null,
): MicroGoalRow[] {
  return ESSENTIAL_MICROS.map((def) => ({
    def,
    goal: resolveGoal(def.dv, calories, sex),
    consumed: Math.round((totalsGrams[def.key] ?? 0) * def.factor * 100) / 100,
    kind: def.kind,
  }));
}
