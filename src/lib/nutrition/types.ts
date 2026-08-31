/** Nutrition domain types (CLAUDE.md §5B, §6). */

export type Sex = "male" | "female";

/** Activity level → TDEE multiplier bracket. */
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very" | "athlete";

/** Supported goals (§5B). "recomp" is treated as maintenance calories. */
export type Goal = "lose" | "maintain" | "recomp" | "gain" | "habits_only";

/** Goals in menu order, with client-facing labels + a one-line description. */
export const GOAL_OPTIONS: { value: Goal; label: string; help: string }[] = [
  { value: "lose", label: "Lose fat", help: "A calorie deficit to drop body fat." },
  { value: "gain", label: "Build muscle", help: "A modest surplus to gain." },
  { value: "maintain", label: "Maintain", help: "Hold steady at maintenance." },
  { value: "recomp", label: "Recomp", help: "Maintenance calories, recompose." },
  { value: "habits_only", label: "Habits only", help: "No weight goal — just habits." },
];

export function isGoal(v: unknown): v is Goal {
  return typeof v === "string" && GOAL_OPTIONS.some((g) => g.value === v);
}

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
