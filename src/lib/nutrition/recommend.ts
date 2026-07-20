import type { NormalizedFood } from "@/lib/food/off";
import { allGenericFoods } from "@/lib/food/generic-foods";
import { buildMicroGoals, ESSENTIAL_MICROS } from "@/lib/nutrition/micros";
import type { Sex } from "@/lib/types/db";

/**
 * "Ways to fill your rings" recommender (§5B, and a rule-based precursor to the
 * §11 AI assistant). Given what a client still needs today — protein/fiber left,
 * and which vitamins/minerals are furthest from goal — it suggests real foods
 * from the catalog that best close those gaps. It only ranks by the catalog's
 * actual reference values; it never invents numbers.
 */

export interface FoodPick {
  name: string;
  grams: number;
  /** How much of the target nutrient one typical serving provides, formatted. */
  amount: string;
}

export interface RingSuggestion {
  key: string;
  title: string;
  foods: FoodPick[];
}

function fmtAmount(grams: number, unit: string): string {
  if (unit === "g") return `${grams.toFixed(1)} g`;
  if (unit === "mcg") return `${Math.round(grams * 1_000_000)} mcg`;
  return `${Math.round(grams * 1000)} mg`; // mg
}

/** Top foods by amount of `nutrimentKey` in one typical serving. */
function rankByNutrient(
  foods: NormalizedFood[],
  nutrimentKey: string,
  unit: string,
  limit: number,
): FoodPick[] {
  return foods
    .map((f) => {
      const per100 = f.nutrimentsPer100g[nutrimentKey] ?? 0;
      const grams = f.servingSizeG ?? 100;
      const perServing = (per100 * grams) / 100;
      return { food: f, perServing };
    })
    .filter((x) => x.perServing > 0)
    .sort((a, b) => b.perServing - a.perServing)
    .slice(0, limit)
    .map((x) => ({
      name: x.food.name ?? "",
      grams: x.food.servingSizeG ?? 100,
      amount: fmtAmount(x.perServing, unit),
    }));
}

export interface RingInput {
  remainingProteinG: number;
  remainingFiberG: number;
  microTotalsGrams: Record<string, number>;
  calories: number;
  sex: Sex | null;
}

/**
 * Build up to `max` suggestions, prioritizing protein, then fiber, then the
 * essential micros furthest below goal that we have candidate foods for.
 */
export function suggestFills(input: RingInput, max = 3): RingSuggestion[] {
  const foods = allGenericFoods();
  const suggestions: RingSuggestion[] = [];

  // 1. Protein.
  if (input.remainingProteinG >= 15) {
    const picks = rankByNutrient(foods, "proteins", "g", 3);
    if (picks.length) {
      suggestions.push({
        key: "protein",
        title: `${Math.round(input.remainingProteinG)}g protein to go`,
        foods: picks,
      });
    }
  }

  // 2. Fiber.
  if (input.remainingFiberG >= 6) {
    const picks = rankByNutrient(foods, "fiber", "g", 3);
    if (picks.length) {
      suggestions.push({
        key: "fiber",
        title: `${Math.round(input.remainingFiberG)}g fiber to go`,
        foods: picks,
      });
    }
  }

  // 3. Micros furthest below goal (that we can actually recommend for).
  const goals = buildMicroGoals(input.microTotalsGrams, input.calories, input.sex).filter(
    (g) => g.kind === "goal",
  );
  const shortMicros = goals
    .map((g) => ({ g, ratio: g.goal > 0 ? g.consumed / g.goal : 1 }))
    .filter((x) => x.ratio < 0.6)
    .sort((a, b) => a.ratio - b.ratio);

  for (const { g } of shortMicros) {
    if (suggestions.length >= max) break;
    if (g.def.key === "fiber") continue; // already covered
    const def = ESSENTIAL_MICROS.find((m) => m.key === g.def.key);
    if (!def) continue;
    const picks = rankByNutrient(foods, g.def.key, def.unit, 3);
    if (picks.length) {
      suggestions.push({ key: g.def.key, title: `Low on ${def.label}`, foods: picks });
    }
  }

  return suggestions.slice(0, max);
}
