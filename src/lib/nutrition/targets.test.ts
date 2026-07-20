import { describe, expect, it } from "vitest";
import {
  bmr,
  computeTargets,
  goalCalories,
  proteinPerPound,
  tdee,
} from "@/lib/nutrition/targets";
import type { Intake } from "@/lib/nutrition/types";

const base: Intake = {
  sex: "male",
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activity: "moderate",
  goal: "maintain",
  dietPreference: "balanced",
};

describe("Precision-Nutrition targets", () => {
  it("computes Mifflin-St Jeor BMR correctly", () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(bmr("male", 30, 180, 80)).toBe(1780);
    // female: -161 instead of +5 → 1614
    expect(bmr("female", 30, 180, 80)).toBe(1614);
  });

  it("applies the activity multiplier for TDEE", () => {
    expect(tdee(base)).toBeCloseTo(1780 * 1.55, 1);
  });

  it("cuts calories for fat loss and never below BMR", () => {
    const lose = { ...base, goal: "lose" as const };
    const maintain = goalCalories(base);
    expect(goalCalories(lose)).toBeLessThan(maintain);
    expect(goalCalories(lose)).toBeGreaterThanOrEqual(bmr("male", 30, 180, 80));
  });

  it("adds only a modest surplus for gain", () => {
    const gain = goalCalories({ ...base, goal: "gain" });
    const maintain = goalCalories(base);
    expect(gain).toBeGreaterThan(maintain);
    expect(gain).toBeLessThan(maintain * 1.2); // modest, not a bulk
  });

  it("keeps protein within the documented 0.65–1.35 g/lb range", () => {
    for (const activity of ["sedentary", "light", "moderate", "very", "athlete"] as const) {
      for (const goal of ["lose", "maintain", "gain"] as const) {
        const g = proteinPerPound({ ...base, activity, goal });
        expect(g).toBeGreaterThanOrEqual(0.65);
        expect(g).toBeLessThanOrEqual(1.35);
      }
    }
  });

  it("produces macros whose calories reconcile to the calorie target (±2%)", () => {
    const t = computeTargets(base);
    const macroCals = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
    expect(Math.abs(macroCals - t.calories) / t.calories).toBeLessThan(0.02);
  });

  it("low-carb yields fewer carbs than balanced; low-fat yields less fat", () => {
    const balanced = computeTargets(base);
    const lowCarb = computeTargets({ ...base, dietPreference: "low_carb" });
    const lowFat = computeTargets({ ...base, dietPreference: "low_fat" });
    expect(lowCarb.carbsG).toBeLessThan(balanced.carbsG);
    expect(lowFat.fatG).toBeLessThan(balanced.fatG);
  });

  it("never returns negative macros, even in a large deficit", () => {
    const t = computeTargets({
      ...base,
      weightKg: 55,
      goal: "lose",
      activity: "sedentary",
      dietPreference: "low_fat",
    });
    expect(t.calories).toBeGreaterThan(0);
    expect(t.proteinG).toBeGreaterThanOrEqual(0);
    expect(t.carbsG).toBeGreaterThanOrEqual(0);
    expect(t.fatG).toBeGreaterThanOrEqual(0);
  });
});
