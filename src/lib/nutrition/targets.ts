import type {
  ActivityLevel,
  DietPreference,
  Goal,
  Intake,
  NutritionTargets,
} from "@/lib/nutrition/types";

/**
 * Precision-Nutrition-style targets calculator (CLAUDE.md §5B).
 *
 * Order matters and mirrors the PN method:
 *   1. Calories — maintenance (TDEE) with a goal adjustment: a deficit for fat
 *      loss, a *modest* surplus for gain, maintenance for health/recomp.
 *   2. Protein first — grams per pound of bodyweight on a sliding scale.
 *   3. Fat or carbs by preference; the remaining calories fill the other macro.
 *
 * Calorie model: Mifflin-St Jeor BMR × activity multiplier for TDEE. This is a
 * pragmatic, well-validated starting point; the NIH Body-Weight-Planner dynamic
 * model (metabolic adaptation over time) can replace `tdee()` later without
 * touching callers. Targets are meant to be recalculated every 4–6 weeks (§5B),
 * so a static estimate is appropriate for a single cycle.
 */

const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_CARB = 4;
const KCAL_PER_G_FAT = 9;
const LB_PER_KG = 2.20462;

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  athlete: 1.9,
};

/** Mifflin-St Jeor basal metabolic rate (kcal/day). */
export function bmr(sex: Intake["sex"], age: number, heightCm: number, weightKg: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return base + (sex === "male" ? 5 : -161);
}

/** Total daily energy expenditure = BMR × activity multiplier. */
export function tdee(intake: Intake): number {
  return bmr(intake.sex, intake.age, intake.heightCm, intake.weightKg) * ACTIVITY_MULTIPLIER[intake.activity];
}

/**
 * Goal-adjusted calorie target. Deficit/surplus are percentage-based but the
 * deficit is floored so we never prescribe below BMR — a hard safety rail.
 */
export function goalCalories(intake: Intake): number {
  const maintenance = tdee(intake);
  const floor = bmr(intake.sex, intake.age, intake.heightCm, intake.weightKg);

  let calories = maintenance;
  switch (intake.goal) {
    case "lose":
      calories = maintenance * 0.8; // ~20% deficit
      break;
    case "gain":
      calories = maintenance * 1.1; // modest ~10% surplus
      break;
    case "maintain":
    case "recomp":
    case "habits_only":
      calories = maintenance;
      break;
  }
  return Math.round(Math.max(calories, floor));
}

/**
 * Protein grams-per-pound on a sliding scale (~0.65–1.35 g/lb, §5B). Higher for
 * fat loss and muscle gain (protein spares muscle / builds it) and for higher
 * activity; a touch higher for males. Clamped to the documented range.
 */
export function proteinPerPound(intake: Intake): number {
  let g = 0.8;
  if (intake.goal === "lose" || intake.goal === "gain") g += 0.25;
  if (intake.activity === "very" || intake.activity === "athlete") g += 0.15;
  else if (intake.activity === "sedentary") g -= 0.1;
  if (intake.sex === "male") g += 0.05;
  return Math.min(1.35, Math.max(0.65, g));
}

/** Split the calories left after protein into carbs and fat by preference (§5B). */
function splitRemaining(
  calories: number,
  proteinCals: number,
  preference: DietPreference,
): { carbCals: number; fatCals: number } {
  const remaining = Math.max(0, calories - proteinCals);

  // A healthy fat floor (~15% of calories) so low-fat/low-carb never zero it out.
  const fatFloorCals = calories * 0.15;

  let carbCals: number;
  let fatCals: number;
  switch (preference) {
    case "low_carb":
      carbCals = calories * 0.2;
      fatCals = remaining - carbCals;
      break;
    case "low_fat":
      fatCals = Math.max(fatFloorCals, calories * 0.2);
      carbCals = remaining - fatCals;
      break;
    case "balanced":
    default:
      carbCals = remaining / 2;
      fatCals = remaining / 2;
      break;
  }

  // Guard the fat floor without letting carbs go negative.
  if (fatCals < fatFloorCals) {
    fatCals = Math.min(fatFloorCals, remaining);
    carbCals = remaining - fatCals;
  }
  carbCals = Math.max(0, carbCals);
  fatCals = Math.max(0, fatCals);
  return { carbCals, fatCals };
}

/** Full PN target calculation from a client's intake. */
export function computeTargets(intake: Intake): NutritionTargets {
  const calories = goalCalories(intake);
  const weightLb = intake.weightKg * LB_PER_KG;
  const proteinG = Math.round(weightLb * proteinPerPound(intake));
  const proteinCals = proteinG * KCAL_PER_G_PROTEIN;

  const { carbCals, fatCals } = splitRemaining(calories, proteinCals, intake.dietPreference);

  return {
    calories,
    proteinG,
    carbsG: Math.round(carbCals / KCAL_PER_G_CARB),
    fatG: Math.round(fatCals / KCAL_PER_G_FAT),
  };
}
