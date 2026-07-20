import { describe, expect, it } from "vitest";
import { suggestMeals, shortMicroKeys } from "@/lib/nutrition/meals";

describe("meal suggestions", () => {
  it("returns loggable meals matched to gaps", () => {
    const meals = suggestMeals({
      remainingProteinG: 50,
      remainingFiberG: 20,
      remainingCalories: 1200,
      shortMicroKeys: ["vitamin-c", "iron"],
    });
    expect(meals.length).toBeGreaterThan(0);
    const m = meals[0];
    expect(m.calories).toBeGreaterThan(0);
    expect(m.proteinG).toBeGreaterThan(0);
    expect(m.ingredients.length).toBeGreaterThan(1); // it's a combination
    // Every item can be logged: has grams and a per-100g map.
    for (const it of m.items) {
      expect(it.grams).toBeGreaterThan(0);
      expect(it.nutrimentsPer100g.energy_kcal).toBeGreaterThan(0);
    }
  });

  it("computes a meal's nutrition by summing its scaled ingredients", () => {
    // Chicken & rice bowl should be high protein.
    const meals = suggestMeals({
      remainingProteinG: 60,
      remainingFiberG: 0,
      remainingCalories: 2000,
      shortMicroKeys: [],
    });
    const bowl = meals.find((m) => m.name === "Chicken & rice power bowl");
    expect(bowl).toBeTruthy();
    // 150g cooked chicken breast alone is ~46g protein.
    expect(bowl!.proteinG).toBeGreaterThan(40);
  });

  it("caps the number of meals", () => {
    const meals = suggestMeals(
      { remainingProteinG: 50, remainingFiberG: 20, remainingCalories: 2000, shortMicroKeys: [] },
      2,
    );
    expect(meals.length).toBeLessThanOrEqual(2);
  });

  it("flags micros below 60% of goal as short", () => {
    // Nothing consumed → basically everything is short.
    const keys = shortMicroKeys({}, 2000, "male");
    expect(keys).toContain("vitamin-c");
    expect(keys).toContain("calcium");
    // A well-met micro is not short.
    const met = shortMicroKeys({ "vitamin-c": 0.2 /* 200mg >> 90 */ }, 2000, "male");
    expect(met).not.toContain("vitamin-c");
  });
});
