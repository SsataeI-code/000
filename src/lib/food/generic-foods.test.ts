import { describe, expect, it } from "vitest";
import { GENERIC_FOOD_COUNT, searchGenericFoods } from "@/lib/food/generic-foods";

describe("generic foods fallback", () => {
  it("ships a substantial reference table", () => {
    expect(GENERIC_FOOD_COUNT).toBeGreaterThan(150);
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
});
