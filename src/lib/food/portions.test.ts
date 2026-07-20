import { describe, expect, it } from "vitest";
import { gramsForPortion, PORTION_OPTIONS } from "@/lib/food/portions";

describe("food portions", () => {
  it("converts ounces exactly", () => {
    expect(gramsForPortion(2, "oz")).toBe(57); // 2 * 28.35 ≈ 56.7
  });

  it("uses the product serving size for servings and pieces", () => {
    expect(gramsForPortion(2, "serving", 30)).toBe(60);
    expect(gramsForPortion(3, "piece", 50)).toBe(150);
  });

  it("falls back sensibly when serving size is unknown", () => {
    expect(gramsForPortion(1, "serving")).toBe(100);
    expect(gramsForPortion(1, "piece")).toBe(50);
  });

  it("approximates common household volumes", () => {
    expect(gramsForPortion(1, "cup")).toBe(240);
    expect(gramsForPortion(2, "tbsp")).toBe(30);
    expect(gramsForPortion(1, "handful")).toBe(30);
  });

  it("passes grams straight through and offers a full option list", () => {
    expect(gramsForPortion(150, "g")).toBe(150);
    expect(PORTION_OPTIONS.length).toBeGreaterThanOrEqual(6);
    expect(PORTION_OPTIONS.map((o) => o.unit)).toContain("serving");
  });
});
