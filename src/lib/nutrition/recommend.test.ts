import { describe, expect, it } from "vitest";
import { suggestFills } from "@/lib/nutrition/recommend";

describe("fill-your-rings recommender", () => {
  it("suggests protein foods when protein is short", () => {
    const s = suggestFills({
      remainingProteinG: 45,
      remainingFiberG: 0,
      microTotalsGrams: {},
      calories: 2000,
      sex: "male",
    });
    const protein = s.find((x) => x.key === "protein");
    expect(protein).toBeTruthy();
    expect(protein!.foods.length).toBeGreaterThan(0);
    expect(protein!.foods[0].amount).toMatch(/g$/);
    // Top pick should genuinely be protein-dense.
    expect(parseFloat(protein!.foods[0].amount)).toBeGreaterThan(15);
  });

  it("recommends the micronutrients furthest below goal", () => {
    const s = suggestFills({
      remainingProteinG: 0,
      remainingFiberG: 0,
      microTotalsGrams: {}, // nothing consumed → every micro is at 0
      calories: 2000,
      sex: "male",
    });
    expect(s.length).toBeGreaterThan(0);
    // Vitamin A is first in the essential list and has candidate foods.
    expect(s[0].key).toBe("vitamin-a");
    expect(s[0].foods.length).toBeGreaterThan(0);
  });

  it("suggests real Vitamin C sources with sensible amounts", () => {
    // Force only vitamin-c to be short by pretending everything else is met.
    const met: Record<string, number> = {};
    // Give big amounts to all micros except vitamin-c so only C is < 60% of goal.
    for (const k of ["vitamin-a", "vitamin-d", "vitamin-e", "vitamin-k", "vitamin-b1", "vitamin-b2", "vitamin-pp", "vitamin-b6", "vitamin-b9", "vitamin-b12", "calcium", "iron", "magnesium", "zinc", "potassium", "phosphorus", "copper", "selenium", "fiber"]) {
      met[k] = 999;
    }
    const s = suggestFills({
      remainingProteinG: 0,
      remainingFiberG: 0,
      microTotalsGrams: met,
      calories: 2000,
      sex: "male",
    });
    const c = s.find((x) => x.key === "vitamin-c");
    expect(c).toBeTruthy();
    const names = c!.foods.map((f) => f.name);
    // Bell pepper is the densest Vitamin C source in the catalog.
    expect(names).toContain("Bell pepper");
    expect(c!.foods[0].amount).toMatch(/mg$/);
  });

  it("returns nothing when the day is on track", () => {
    const met: Record<string, number> = {};
    for (const k of ["vitamin-a", "vitamin-c", "vitamin-d", "vitamin-e", "vitamin-k", "vitamin-b1", "vitamin-b2", "vitamin-pp", "vitamin-b6", "vitamin-b9", "vitamin-b12", "calcium", "iron", "magnesium", "zinc", "potassium", "phosphorus", "copper", "selenium", "fiber"]) {
      met[k] = 999;
    }
    const s = suggestFills({
      remainingProteinG: 2,
      remainingFiberG: 1,
      microTotalsGrams: met,
      calories: 2000,
      sex: "female",
    });
    expect(s).toEqual([]);
  });

  it("caps the number of suggestions", () => {
    const s = suggestFills({
      remainingProteinG: 60,
      remainingFiberG: 30,
      microTotalsGrams: {},
      calories: 2000,
      sex: "male",
    });
    expect(s.length).toBeLessThanOrEqual(3);
  });
});
