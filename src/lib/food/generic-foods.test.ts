import { describe, expect, it } from "vitest";
import {
  allGenericFoodNames,
  editDistance,
  GENERIC_FOOD_COUNT,
  searchGenericFoods,
} from "@/lib/food/generic-foods";

describe("generic foods fallback", () => {
  it("ships a substantial reference table", () => {
    expect(GENERIC_FOOD_COUNT).toBeGreaterThan(500);
  });

  it("contains NO duplicate food names (case-insensitive)", () => {
    const names = allGenericFoodNames().map((n) => n.toLowerCase());
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes).toEqual([]);
  });

  it("returns each food at most once for a query", () => {
    const results = searchGenericFoods("chicken", 20).map((f) => f.name);
    expect(new Set(results).size).toBe(results.length);
  });

  it("finds white bread by name", () => {
    const r = searchGenericFoods("white bread");
    expect(r[0]?.name).toBe("White bread");
    expect(r[0]?.per100g.calories).toBeGreaterThan(200);
    expect(r[0]?.brand).toBe("Generic");
  });

  it("matches 'white toast' to white bread via keywords", () => {
    const names = searchGenericFoods("white toast").map((f) => f.name);
    expect(names).toContain("White bread");
  });

  it("matches common staples", () => {
    expect(searchGenericFoods("chicken breast")[0]?.name).toBe("Chicken breast, cooked");
    expect(searchGenericFoods("rice").some((f) => (f.name ?? "").includes("rice"))).toBe(true);
    expect((searchGenericFoods("egg")[0]?.name ?? "").toLowerCase()).toContain("egg");
  });

  it("returns nothing for very short or nonsense queries", () => {
    expect(searchGenericFoods("a")).toEqual([]);
    expect(searchGenericFoods("zzxqwv")).toEqual([]);
  });

  it("every result carries complete, non-missing macros", () => {
    for (const f of searchGenericFoods("bread")) {
      expect(f.missing).toEqual([]);
      expect(f.per100g.calories).not.toBeNull();
      expect(f.per100g.proteinG).not.toBeNull();
    }
  });

  it("distinguishes bread varieties uniquely", () => {
    expect(searchGenericFoods("rye slice")[0]?.name).toBe("Rye bread");
    expect(searchGenericFoods("whole wheat slice")[0]?.name).toBe("Whole wheat bread");
    expect(searchGenericFoods("sourdough")[0]?.name).toBe("Sourdough bread");
    expect(searchGenericFoods("pumpernickel")[0]?.name).toBe("Pumpernickel bread");
    // Each variety has its own macros, not a shared copy.
    const rye = searchGenericFoods("rye slice")[0];
    const white = searchGenericFoods("white bread")[0];
    expect(rye?.per100g.carbsG).not.toBe(white?.per100g.carbsG);
  });

  it("is case-insensitive and typo-tolerant", () => {
    expect(searchGenericFoods("WHITE BREAD")[0]?.name).toBe("White bread");
    expect(searchGenericFoods("chikn breast")[0]?.name).toBe("Chicken breast, cooked");
    expect(searchGenericFoods("brocoli").some((f) => f.name === "Broccoli")).toBe(true);
    expect(searchGenericFoods("banan").some((f) => f.name === "Banana")).toBe(true);
  });

  it("editDistance measures typos", () => {
    expect(editDistance("chicken", "chicken")).toBe(0);
    expect(editDistance("chikn", "chicken")).toBeLessThanOrEqual(2);
    expect(editDistance("broccoli", "brocoli")).toBe(1);
  });
});
