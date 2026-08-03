/**
 * Plate builder (a teaching tool — "learn and visualize what you're eating").
 * Pure and tested: turns hand-portion counts into approximate macros/calories so
 * a client can build a plate and *see* its balance without weighing anything.
 * Estimates are teaching approximations from the hand-portion method — clearly
 * "about", never presented as an exact log.
 */

export interface PlateCounts {
  palms: number; // protein
  cupped: number; // starchy carbs
  thumbs: number; // fats
  fists: number; // veggies
}

export interface PlateTotals {
  proteinG: number;
  carbsG: number;
  fatG: number;
  calories: number;
}

// Approximate macro grams per hand portion (teaching values).
const PER = {
  palm: { p: 22, c: 0, f: 4 }, // protein foods carry a little fat
  cupped: { p: 2, c: 22, f: 0 }, // starchy carbs
  thumb: { p: 0, c: 0, f: 10 }, // fats/oils
  fist: { p: 2, c: 6, f: 0 }, // non-starchy veggies
};

export const EMPTY_PLATE: PlateCounts = { palms: 0, cupped: 0, thumbs: 0, fists: 0 };

export function plateTotals(c: PlateCounts): PlateTotals {
  const n = (v: number) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  const palms = n(c.palms);
  const cupped = n(c.cupped);
  const thumbs = n(c.thumbs);
  const fists = n(c.fists);

  const proteinG = palms * PER.palm.p + cupped * PER.cupped.p + thumbs * PER.thumb.p + fists * PER.fist.p;
  const carbsG = palms * PER.palm.c + cupped * PER.cupped.c + thumbs * PER.thumb.c + fists * PER.fist.c;
  const fatG = palms * PER.palm.f + cupped * PER.cupped.f + thumbs * PER.thumb.f + fists * PER.fist.f;
  const calories = proteinG * 4 + carbsG * 4 + fatG * 9;
  return { proteinG, carbsG, fatG, calories };
}

/** Calorie share (0..1) of each macro — for the plate visual. Sums to ≤1 (0 when empty). */
export function macroShares(t: PlateTotals): { protein: number; carbs: number; fat: number } {
  const total = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: (t.proteinG * 4) / total,
    carbs: (t.carbsG * 4) / total,
    fat: (t.fatG * 9) / total,
  };
}
