import { describe, expect, it } from "vitest";
import { gramsForPortion, PORTION_OPTIONS, pieceUnitFor } from "@/lib/food/portions";

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

  describe("pieceUnitFor — natural count units", () => {
    it("names eggs and bread slices", () => {
      expect(pieceUnitFor("Egg, whole")).toEqual({ one: "egg", many: "eggs" });
      expect(pieceUnitFor("White bread")).toEqual({ one: "slice", many: "slices" });
      expect(pieceUnitFor("Whole wheat bread")?.many).toBe("slices");
      expect(pieceUnitFor("Bacon, cooked")?.many).toBe("slices");
    });

    it("handles rolls, wraps, bagels, pancakes, fruit", () => {
      expect(pieceUnitFor("Dinner roll")?.one).toBe("roll");
      expect(pieceUnitFor("Flour tortilla")?.one).toBe("wrap");
      expect(pieceUnitFor("Plain bagel")?.one).toBe("bagel");
      expect(pieceUnitFor("Banana")?.many).toBe("bananas");
    });

    it("skips prepared dishes where a piece is meaningless", () => {
      expect(pieceUnitFor("Scrambled eggs")).toBeNull();
      expect(pieceUnitFor("Egg salad")).toBeNull();
      expect(pieceUnitFor("French toast")).toBeNull();
      expect(pieceUnitFor("Chicken breast, cooked")).toBeNull();
    });
  });
});
