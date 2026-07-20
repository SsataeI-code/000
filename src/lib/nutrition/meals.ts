import type { NormalizedFood } from "@/lib/food/off";
import { allGenericFoods } from "@/lib/food/generic-foods";
import { ESSENTIAL_MICROS } from "@/lib/nutrition/micros";
import type { Sex } from "@/lib/types/db";

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
}

function catalogMap(): Map<string, NormalizedFood> {
  const m = new Map<string, NormalizedFood>();
  for (const f of allGenericFoods()) if (f.name) m.set(f.name, f);
  return m;
}

interface ComputedMeal extends MealSuggestion {
  microsGrams: Record<string, number>;
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

  // "Rich in" = essential micros the meal delivers at >= 25% of the 2000-cal DV.
  const richIn: string[] = ESSENTIAL_MICROS.filter((def) => {
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

  return {
    name: t.name,
    kind: t.kind,
    calories: Math.round(calories),
    proteinG: Math.round(proteinG),
    fiberG: Math.round(fiberG),
    richIn,
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
}

/** Rank meals by how well they close today's biggest gaps. */
export function suggestMeals(input: MealInput, max = 2): MealSuggestion[] {
  const map = catalogMap();
  const short = new Set(input.shortMicroKeys);

  const scored = MEAL_TEMPLATES.map((t) => computeMeal(t, map))
    .filter((m): m is ComputedMeal => m !== null)
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
      const score = proteinFill * 1.5 + fiberFill * 3 + microMatches * 12 - over * 0.03;
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
