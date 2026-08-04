import { describe, it, expect } from "vitest";
import { isStrictness, strictnessLabel, showsMacros, macroRange, STRICTNESS_OPTIONS } from "@/lib/nutrition/strictness";

describe("strictness", () => {
  it("validates known values only", () => {
    expect(isStrictness("flexible")).toBe(true);
    expect(isStrictness("precise")).toBe(true);
    expect(isStrictness("nope")).toBe(false);
    expect(isStrictness(null)).toBe(false);
  });

  it("offers four coach-selectable options", () => {
    expect(STRICTNESS_OPTIONS.map((o) => o.value)).toEqual(["precise", "protein_cals", "flexible", "habits_only"]);
  });

  it("labels and macro visibility", () => {
    expect(strictnessLabel("habits_only")).toBe("Habits only");
    expect(showsMacros("habits_only")).toBe(false);
    expect(showsMacros("flexible")).toBe(true);
  });

  it("builds a ± range, guarding zero/invalid targets", () => {
    expect(macroRange(2000, 0.1)).toEqual({ low: 1800, high: 2200 });
    expect(macroRange(0)).toEqual({ low: 0, high: 0 });
    expect(macroRange(NaN)).toEqual({ low: 0, high: 0 });
  });
});
