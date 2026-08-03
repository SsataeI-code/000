import { describe, it, expect } from "vitest";
import { handPortions } from "@/lib/nutrition/hand-portions";

describe("handPortions", () => {
  it("converts gram targets into whole hand portions", () => {
    // 165g protein / 22 ≈ 7.5 → 8 palms; 220/22 = 10 cupped; 60/10 = 6 thumbs.
    expect(handPortions({ proteinG: 165, carbsG: 220, fatG: 60 })).toEqual({ palms: 8, cupped: 10, thumbs: 6 });
  });

  it("always gives at least one palm of protein", () => {
    expect(handPortions({ proteinG: 0, carbsG: 0, fatG: 0 }).palms).toBe(1);
  });

  it("allows zero carbs/fat portions and never returns negatives", () => {
    const p = handPortions({ proteinG: 120, carbsG: 0, fatG: 0 });
    expect(p.cupped).toBe(0);
    expect(p.thumbs).toBe(0);
    expect(p.palms).toBeGreaterThanOrEqual(1);
  });

  it("handles malformed (NaN) targets defensively", () => {
    expect(handPortions({ proteinG: NaN, carbsG: NaN, fatG: NaN })).toEqual({ palms: 1, cupped: 0, thumbs: 0 });
  });
});
