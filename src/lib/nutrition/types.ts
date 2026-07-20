/** Nutrition domain types (CLAUDE.md §5B, §6). */

export type Sex = "male" | "female";

/** Activity level → TDEE multiplier bracket. */
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very" | "athlete";

/** Supported goals (§5B). "recomp" is treated as maintenance calories. */
export type Goal = "lose" | "maintain" | "recomp" | "gain" | "habits_only";

/** Macro split preference (§5B). */
export type DietPreference = "balanced" | "low_carb" | "low_fat";

/** Raw intake collected at first run (§8). Metric internally. */
export interface Intake {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
  dietPreference: DietPreference;
}

/** Computed daily targets. Micros are tracked from food, not targeted (§5B). */
export interface NutritionTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** The four macro nutrients we surface as rings on Today. */
export interface Macros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}
