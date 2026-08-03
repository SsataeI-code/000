import { describe, it, expect } from "vitest";
import { plateTotals, macroShares, EMPTY_PLATE } from "@/lib/nutrition/plate";

describe("plateTotals", () => {
  it("is all zero for an empty plate", () => {
    expect(plateTotals(EMPTY_PLATE)).toEqual({ proteinG: 0, carbsG: 0, fatG: 0, calories: 0 });
  });

  it("sums hand portions into macros and calories", () => {
    // 2 palms (44p, 8f) + 1 cupped (2p,22c) + 1 thumb (10f) + 1 fist (2p,6c)
    const t = plateTotals({ palms: 2, cupped: 1, thumbs: 1, fists: 1 });
    expect(t.proteinG).toBe(48); // 44 + 2 + 0 + 2
    expect(t.carbsG).toBe(28); // 22 + 6
    expect(t.fatG).toBe(18); // 8 + 10
    expect(t.calories).toBe(48 * 4 + 28 * 4 + 18 * 9); // 466
  });

  it("ignores negative/NaN counts defensively", () => {
    expect(plateTotals({ palms: -3, cupped: NaN, thumbs: 2, fists: 0 })).toEqual({
      proteinG: 0,
      carbsG: 0,
      fatG: 20,
      calories: 180,
    });
  });
});

describe("macroShares", () => {
  it("returns zeros for an empty plate", () => {
    expect(macroShares(plateTotals(EMPTY_PLATE))).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });

  it("splits calorie share across macros summing to ~1", () => {
    const s = macroShares(plateTotals({ palms: 1, cupped: 1, thumbs: 1, fists: 0 }));
    expect(s.protein + s.carbs + s.fat).toBeCloseTo(1, 5);
    expect(s.protein).toBeGreaterThan(0);
  });
});
