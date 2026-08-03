/**
 * Hand-portion guidance (§B — "optional hand-portion guidance for clients who
 * don't want to count grams"). Precision Nutrition's method: a palm of protein,
 * a cupped hand of carbs, a thumb of fats, a fist of veggies. Pure and tested:
 * turns the client's own gram targets into a daily count of hand portions. Uses
 * only the client's targets — never invents numbers.
 */

// Reference grams per hand portion (PN teaching values).
export const PER_PALM_PROTEIN_G = 22;
export const PER_CUPPED_CARB_G = 22;
export const PER_THUMB_FAT_G = 10;

export interface HandTargets {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface HandPortions {
  palms: number; // protein
  cupped: number; // carbs
  thumbs: number; // fats
}

const clampRound = (g: number, per: number, min: number): number => {
  if (!Number.isFinite(g) || g <= 0) return min;
  return Math.max(min, Math.round(g / per));
};

/** Convert gram targets into whole daily hand portions. Protein always ≥1 palm. */
export function handPortions(t: HandTargets): HandPortions {
  return {
    palms: clampRound(t.proteinG, PER_PALM_PROTEIN_G, 1),
    cupped: clampRound(t.carbsG, PER_CUPPED_CARB_G, 0),
    thumbs: clampRound(t.fatG, PER_THUMB_FAT_G, 0),
  };
}
