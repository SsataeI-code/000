import type { NormalizedFood } from "@/lib/food/off";
import { recommendableFoods } from "@/lib/food/generic-foods";
import { allowedByDiet, type DietFilter } from "@/lib/food/diet";
import { ESSENTIAL_MICROS } from "@/lib/nutrition/micros";
import type { Sex, Meal } from "@/lib/types/db";

/**
 * Simple, balanced meal combinations built from catalog foods (§5B, precursor to
 * the §11 AI assistant). Each is ranked against what the client still needs
 * today, computed from the catalog's real values — nothing invented. A meal can
 * be logged in one tap (see logMealAction), which is the "easy to follow" bit.
 */

interface MealTemplate {
  name: string;
  kind: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  items: Array<{ name: string; grams: number }>;
}

const MEAL_TEMPLATES: MealTemplate[] = [
  {
    name: "Chicken & rice power bowl",
    kind: "Lunch",
    items: [
      { name: "Chicken breast, cooked", grams: 150 },
      { name: "Brown rice, cooked", grams: 150 },
      { name: "Broccoli", grams: 100 },
    ],
  },
  {
    name: "Salmon & sweet potato plate",
    kind: "Dinner",
    items: [
      { name: "Salmon, cooked", grams: 120 },
      { name: "Sweet potato, cooked", grams: 150 },
      { name: "Spinach", grams: 60 },
    ],
  },
  {
    name: "Greek yogurt parfait",
    kind: "Breakfast",
    items: [
      { name: "Greek yogurt, plain nonfat", grams: 200 },
      { name: "Blueberries", grams: 80 },
      { name: "Almonds", grams: 20 },
    ],
  },
  {
    name: "Veggie omelette",
    kind: "Breakfast",
    items: [
      { name: "Egg, whole", grams: 100 },
      { name: "Bell pepper", grams: 60 },
      { name: "Spinach", grams: 40 },
    ],
  },
  {
    name: "Burrito bowl",
    kind: "Lunch",
    items: [
      { name: "Black beans, cooked", grams: 130 },
      { name: "Brown rice, cooked", grams: 120 },
      { name: "Bell pepper", grams: 60 },
      { name: "Avocado", grams: 50 },
    ],
  },
  {
    name: "PB & banana toast",
    kind: "Snack",
    items: [
      { name: "Whole wheat bread", grams: 60 },
      { name: "Peanut butter", grams: 32 },
      { name: "Banana", grams: 100 },
    ],
  },
  {
    name: "Tuna pasta & peas",
    kind: "Dinner",
    items: [
      { name: "Tuna, canned in water", grams: 100 },
      { name: "Whole wheat pasta, cooked", grams: 120 },
      { name: "Peas, green", grams: 80 },
    ],
  },
  {
    name: "Oatmeal & berries",
    kind: "Breakfast",
    items: [
      { name: "Oatmeal, cooked", grams: 240 },
      { name: "Blueberries", grams: 70 },
      { name: "Walnuts", grams: 15 },
    ],
  },
  {
    name: "Lentil & quinoa bowl",
    kind: "Lunch",
    items: [
      { name: "Lentils, cooked", grams: 150 },
      { name: "Quinoa, cooked", grams: 120 },
      { name: "Carrots", grams: 80 },
    ],
  },
  {
    name: "Cottage cheese & fruit",
    kind: "Snack",
    items: [
      { name: "Cottage cheese", grams: 150 },
      { name: "Pineapple", grams: 80 },
      { name: "Almonds", grams: 15 },
    ],
  },
];

export interface MealLogItem {
  name: string;
  grams: number;
  nutrimentsPer100g: Record<string, number>;
}

export interface MealSuggestion {
  name: string;
  kind: string;
  calories: number;
  proteinG: number;
  fiberG: number;
  /** e.g. "Rich in Vitamin C, Iron". */
  richIn: string[];
  /** Human ingredient lines: "Chicken breast, cooked · 150g". */
  ingredients: string[];
  /** Everything needed to log the meal in one tap. */
  items: MealLogItem[];
  /** True when this is one of the client's own saved meals (surfaced as familiar). */
  saved?: boolean;
}

function catalogMap(): Map<string, NormalizedFood> {
  const m = new Map<string, NormalizedFood>();
  for (const f of recommendableFoods()) if (f.name) m.set(f.name, f);
  return m;
}

interface ComputedMeal extends MealSuggestion {
  microsGrams: Record<string, number>;
  /** True for a meal the client saved themselves — surfaced first (familiar). */
  saved?: boolean;
}

/** "Rich in" = essential micros a meal delivers at ≥25% of the 2000-cal DV. */
function richInFrom(microsGrams: Record<string, number>): string[] {
  return ESSENTIAL_MICROS.filter((def) => {
    if (def.kind !== "goal" || typeof def.dv !== "number") return false;
    const provided = (microsGrams[def.key] ?? 0) * def.factor;
    return provided >= def.dv * 0.25;
  })
    .sort(
      (a, b) =>
        (microsGrams[b.key] ?? 0) * b.factor / (b.dv as number) -
        (microsGrams[a.key] ?? 0) * a.factor / (a.dv as number),
    )
    .slice(0, 3)
    .map((d) => d.label);
}

/**
 * Compute a client's own saved meal into the same shape as a template meal, so
 * the recommender can surface meals they've actually built before ("remember
 * meals so recommendations match previously input"). Defensive — a malformed
 * saved meal is skipped, never thrown.
 */
function computeSavedMeal(meal: Meal): ComputedMeal | null {
  if (!meal || !Array.isArray(meal.items) || meal.items.length === 0) return null;
  let calories = 0;
  let proteinG = 0;
  let fiberG = 0;
  const microsGrams: Record<string, number> = {};
  const items: MealLogItem[] = [];
  const ingredients: string[] = [];

  for (const item of meal.items) {
    const n = item?.nutrimentsPer100g ?? {};
    const f = (Number(item?.grams) || 0) / 100;
    calories += (Number(n.energy_kcal) || 0) * f;
    proteinG += (Number(n.proteins) || 0) * f;
    fiberG += (Number(n.fiber) || 0) * f;
    for (const [k, v] of Object.entries(n)) {
      if (["energy_kcal", "proteins", "carbohydrates", "fat"].includes(k)) continue;
      microsGrams[k] = (microsGrams[k] ?? 0) + (Number(v) || 0) * f;
    }
    items.push({ name: item.name, grams: Number(item?.grams) || 0, nutrimentsPer100g: n });
    ingredients.push(`${item.name} · ${Math.round(Number(item?.grams) || 0)}g`);
  }
  if (calories <= 0 && proteinG <= 0) return null;

  return {
    name: meal.name,
    kind: "Your meal",
    calories: Math.round(calories),
    proteinG: Math.round(proteinG),
    fiberG: Math.round(fiberG),
    richIn: richInFrom(microsGrams),
    ingredients,
    items,
    microsGrams,
    saved: true,
  };
}

function computeMeal(t: MealTemplate, map: Map<string, NormalizedFood>): ComputedMeal | null {
  let calories = 0;
  let proteinG = 0;
  let fiberG = 0;
  const microsGrams: Record<string, number> = {};
  const items: MealLogItem[] = [];
  const ingredients: string[] = [];

  for (const item of t.items) {
    const food = map.get(item.name);
    if (!food) return null; // keep meals honest — skip if an item isn't in the catalog
    const f = item.grams / 100;
    const n = food.nutrimentsPer100g;
    calories += (n.energy_kcal ?? 0) * f;
    proteinG += (n.proteins ?? 0) * f;
    fiberG += (n.fiber ?? 0) * f;
    for (const [k, v] of Object.entries(n)) {
      if (["energy_kcal", "proteins", "carbohydrates", "fat"].includes(k)) continue;
      microsGrams[k] = (microsGrams[k] ?? 0) + v * f;
    }
    items.push({ name: item.name, grams: item.grams, nutrimentsPer100g: n });
    ingredients.push(`${item.name} · ${item.grams}g`);
  }

  return {
    name: t.name,
    kind: t.kind,
    calories: Math.round(calories),
    proteinG: Math.round(proteinG),
    fiberG: Math.round(fiberG),
    richIn: richInFrom(microsGrams),
    ingredients,
    items,
    microsGrams,
  };
}

export interface MealInput {
  remainingProteinG: number;
  remainingFiberG: number;
  remainingCalories: number;
  shortMicroKeys: string[];
  /** Optional diet pattern + avoid list — only meals whose every item fits are suggested. */
  diet?: DietFilter;
  /** The client's own saved meals — folded in and preferred so recommendations match what they actually eat. */
  savedMeals?: Meal[];
}

/** One-time familiarity boost so a client's own saved meal surfaces over a generic template. */
const SAVED_MEAL_BOOST = 30;

/** Rank meals by how well they close today's biggest gaps. */
export function suggestMeals(input: MealInput, max = 2): MealSuggestion[] {
  const map = catalogMap();
  const short = new Set(input.shortMicroKeys);
  const diet = input.diet;

  // The client's saved meals lead (they built them, so they fit their diet);
  // template meals fill in behind them, skipping any duplicate name.
  const savedComputed = (input.savedMeals ?? [])
    .map(computeSavedMeal)
    .filter((m): m is ComputedMeal => m !== null);
  const savedNames = new Set(savedComputed.map((m) => m.name.trim().toLowerCase()));

  const templateComputed = MEAL_TEMPLATES.map((t) => computeMeal(t, map))
    .filter((m): m is ComputedMeal => m !== null)
    .filter((m) => !diet || m.items.every((it) => allowedByDiet(it.name, diet)))
    .filter((m) => !savedNames.has(m.name.trim().toLowerCase()));

  const scored = [...savedComputed, ...templateComputed]
    .map((m) => {
      const proteinFill = Math.min(m.proteinG, Math.max(0, input.remainingProteinG));
      const fiberFill = Math.min(m.fiberG, Math.max(0, input.remainingFiberG));
      let microMatches = 0;
      for (const def of ESSENTIAL_MICROS) {
        if (!short.has(def.key)) continue;
        if ((m.microsGrams[def.key] ?? 0) * def.factor > 0) microMatches++;
      }
      // Nudge away from meals that blow the remaining calorie budget.
      const over =
        input.remainingCalories > 0 ? Math.max(0, m.calories - input.remainingCalories) : 0;
      const score = proteinFill * 1.5 + fiberFill * 3 + microMatches * 12 - over * 0.03 + (m.saved ? SAVED_MEAL_BOOST : 0);
      return { m, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, max);

  return scored.map(({ m }) => {
    // Drop the internal micro map from the returned shape.
    const { microsGrams: _omit, ...rest } = m;
    void _omit;
    return rest;
  });
}

/** Short-key list of essential micros a client is below 60% of goal on. */
export function shortMicroKeys(
  totalsGrams: Record<string, number>,
  calories: number,
  sex: Sex | null,
): string[] {
  void calories;
  void sex;
  return ESSENTIAL_MICROS.filter((def) => {
    if (def.kind !== "goal" || typeof def.dv !== "number") return false;
    const consumed = (totalsGrams[def.key] ?? 0) * def.factor;
    return consumed < def.dv * 0.6;
  }).map((d) => d.key);
}
