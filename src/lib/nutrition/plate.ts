/**
 * Shared plate types. The plate builder is a teaching + fast-log tool — the
 * client builds a plate from real foods (see `plate-foods.ts`) and sees its
 * macros/calories build up. Estimates are teaching approximations, never a
 * precise weighed log.
 */

export interface PlateTotals {
  proteinG: number;
  carbsG: number;
  fatG: number;
  calories: number;
}
