import type { ClientProfile, FoodLog, NutritionTargetRow } from "@/lib/types/db";
import type { Macros } from "@/lib/nutrition/types";

/** Pure nutrition summarizers — no server/network deps, so fully unit-testable. */

/** Today's date in UTC as YYYY-MM-DD — matches the food_logs.log_date default. */
export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Sum a set of food logs into a single macro total. */
export function totalMacros(logs: FoodLog[]): Macros {
  return logs.reduce<Macros>(
    (acc, l) => ({
      calories: acc.calories + (Number(l.calories) || 0),
      proteinG: acc.proteinG + (Number(l.protein_g) || 0),
      carbsG: acc.carbsG + (Number(l.carbs_g) || 0),
      fatG: acc.fatG + (Number(l.fat_g) || 0),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

/** Has the client finished first-run intake (so Today has meaningful rings)? */
export function isOnboarded(
  profile: ClientProfile | null,
  targets: NutritionTargetRow | null,
): boolean {
  return Boolean(profile?.onboarded_at && targets);
}
