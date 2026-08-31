/**
 * Keep a calorie + macro set consistent as a coach (or client) edits the target
 * form (§5B). Two simple, predictable rules the owner asked for:
 *   - change calories → ALL macros scale to the new total (ratio preserved).
 *   - change a macro   → calories recompute from the macros (4·P + 4·C + 9·F).
 * Pure — used live in the target editors.
 */

export const KCAL_PROTEIN = 4;
export const KCAL_CARB = 4;
export const KCAL_FAT = 9;

export interface MacroSet {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export type MacroField = "calories" | "proteinG" | "carbsG" | "fatG";

const r = (n: number) => Math.max(0, Math.round(Number.isFinite(n) ? n : 0));

/** Calories implied by the macros. */
export function caloriesFromMacros(set: Pick<MacroSet, "proteinG" | "carbsG" | "fatG">): number {
  return r(set.proteinG * KCAL_PROTEIN + set.carbsG * KCAL_CARB + set.fatG * KCAL_FAT);
}

/** Fraction of calories from each macro — a STABLE reference for calorie edits. */
export interface MacroRatio { protein: number; carbs: number; fat: number }

export function ratioOf(set: Pick<MacroSet, "proteinG" | "carbsG" | "fatG">): MacroRatio {
  const total = caloriesFromMacros(set);
  if (total <= 0) return { protein: 0.3, carbs: 0.4, fat: 0.3 }; // sensible default
  return {
    protein: (set.proteinG * KCAL_PROTEIN) / total,
    carbs: (set.carbsG * KCAL_CARB) / total,
    fat: (set.fatG * KCAL_FAT) / total,
  };
}

/** Grams for each macro at a calorie total, holding a fixed ratio. */
export function macrosAtCalories(calories: number, ratio: MacroRatio): Pick<MacroSet, "proteinG" | "carbsG" | "fatG"> {
  const cal = r(calories);
  return {
    proteinG: r((cal * ratio.protein) / KCAL_PROTEIN),
    carbsG: r((cal * ratio.carbs) / KCAL_CARB),
    fatG: r((cal * ratio.fat) / KCAL_FAT),
  };
}

/**
 * Re-balance after `changed` was edited. `ratio`, when supplied, is a STABLE
 * split captured the last time a macro was edited — used so editing calories
 * digit-by-digit recomputes from that split instead of scaling the (mutating)
 * grams, which collapses to zero on an intermediate value like "3".
 *  - calories: recompute protein/carbs/fat from the ratio.
 *  - any macro: recompute calories as the sum of the macros; others unchanged.
 */
export function balanceMacros(set: MacroSet, changed: MacroField, ratio?: MacroRatio): MacroSet {
  const proteinG = r(set.proteinG);
  const carbsG = r(set.carbsG);
  const fatG = r(set.fatG);

  if (changed === "calories") {
    const targetCal = r(set.calories);
    const split = ratio ?? ratioOf({ proteinG, carbsG, fatG });
    return { calories: targetCal, ...macrosAtCalories(targetCal, split) };
  }

  // A macro changed → calories follow the macros.
  return { calories: caloriesFromMacros({ proteinG, carbsG, fatG }), proteinG, carbsG, fatG };
}

/** Percent of calories from each macro (rounded, for a live readout). */
export function macroPercents(set: MacroSet): { protein: number; carbs: number; fat: number } {
  const total = caloriesFromMacros(set) || 1;
  return {
    protein: Math.round((set.proteinG * KCAL_PROTEIN * 100) / total),
    carbs: Math.round((set.carbsG * KCAL_CARB * 100) / total),
    fat: Math.round((set.fatG * KCAL_FAT * 100) / total),
  };
}
