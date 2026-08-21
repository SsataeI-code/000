import type { NormalizedFood } from "@/lib/food/off";
import { recommendableFoods } from "@/lib/food/generic-foods";
import { buildMicroGoals, ESSENTIAL_MICROS } from "@/lib/nutrition/micros";
import { allowedByDiet, type DietFilter } from "@/lib/food/diet";
import type { Sex } from "@/lib/types/db";

// The nutrients "fill your rings" is willing to suggest a food for — headline
// vitamins/minerals with broad catalog coverage. Trace minerals stay tracked
// but aren't chased with a food nudge.
const RECOMMENDABLE_MICRO_KEYS = new Set<string>([
  "iron", "calcium", "potassium", "magnesium", "zinc",
  "vitamin-c", "vitamin-a", "vitamin-d", "vitamin-b12", "vitamin-b9", "vitamin-e", "vitamin-b6",
]);

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
  /** Macros for one serving — so a suggestion can be logged in one tap. */
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Per-100g nutriment map, for storing micros on the log. */
  per100g: Record<string, number>;
  /** True when the client has logged this food before (familiar). */
  familiar?: boolean;
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

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Top foods by amount of `nutrimentKey` in one typical serving. Foods the client
 * has logged before (`familiar`) get a gentle rank boost — so suggestions lean on
 * what they already eat, while a much-richer new food can still surface.
 */
function rankByNutrient(
  foods: NormalizedFood[],
  nutrimentKey: string,
  unit: string,
  limit: number,
  familiar: Set<string>,
): FoodPick[] {
  return foods
    .map((f) => {
      const per100 = f.nutrimentsPer100g[nutrimentKey] ?? 0;
      const grams = f.servingSizeG ?? 100;
      const perServing = (per100 * grams) / 100;
      const isFamiliar = familiar.has((f.name ?? "").toLowerCase());
      return { food: f, perServing, isFamiliar, rank: perServing * (isFamiliar ? 1.25 : 1) };
    })
    .filter((x) => x.perServing > 0)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map((x) => {
      const grams = x.food.servingSizeG ?? 100;
      const per = (k: string) => ((x.food.nutrimentsPer100g[k] ?? 0) * grams) / 100;
      return {
        name: x.food.name ?? "",
        grams,
        amount: fmtAmount(x.perServing, unit),
        calories: Math.round(per("energy_kcal")),
        proteinG: round1(per("proteins")),
        carbsG: round1(per("carbohydrates")),
        fatG: round1(per("fat")),
        per100g: x.food.nutrimentsPer100g,
        familiar: x.isFamiliar,
      };
    });
}

export interface RingInput {
  remainingProteinG: number;
  remainingFiberG: number;
  microTotalsGrams: Record<string, number>;
  calories: number;
  sex: Sex | null;
  /** Optional diet pattern + avoid list to filter suggestions. */
  diet?: DietFilter;
  /** Lowercased names of foods the client has logged before (familiar-first). */
  recentNames?: string[];
}

/**
 * Build up to `max` suggestions, prioritizing protein, then fiber, then the
 * essential micros furthest below goal that we have candidate foods for.
 */
export function suggestFills(input: RingInput, max = 3): RingSuggestion[] {
  const diet = input.diet;
  const foods = diet ? recommendableFoods().filter((f) => allowedByDiet(f.name ?? "", diet)) : recommendableFoods();
  const familiar = new Set((input.recentNames ?? []).map((n) => n.toLowerCase()));
  const suggestions: RingSuggestion[] = [];

  // 1. Protein.
  if (input.remainingProteinG >= 15) {
    const picks = rankByNutrient(foods, "proteins", "g", 3, familiar);
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
    const picks = rankByNutrient(foods, "fiber", "g", 3, familiar);
    if (picks.length) {
      suggestions.push({
        key: "fiber",
        title: `${Math.round(input.remainingFiberG)}g fiber to go`,
        foods: picks,
      });
    }
  }

  // 3. Micros furthest below goal — but only the headline nutrients worth a food
  // nudge. We don't chase trace minerals (manganese, chloride, choline…) with a
  // "fill your rings" suggestion, which would surface odd fillers like syrup.
  const goals = buildMicroGoals(input.microTotalsGrams, input.calories, input.sex).filter(
    (g) => g.kind === "goal" && RECOMMENDABLE_MICRO_KEYS.has(g.def.key),
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
    const picks = rankByNutrient(foods, g.def.key, def.unit, 3, familiar);
    if (picks.length) {
      suggestions.push({ key: g.def.key, title: `Low on ${def.label}`, foods: picks });
    }
  }

  return suggestions.slice(0, max);
}
