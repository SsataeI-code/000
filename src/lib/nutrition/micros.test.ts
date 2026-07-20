import { describe, expect, it } from "vitest";
import {
  buildMicroGoals,
  DISPLAY_MICROS,
  ESSENTIAL_MICROS,
  formatMicro,
  presentMicros,
  scaleNutriments,
  sumMicros,
} from "@/lib/nutrition/micros";
import type { FoodLog } from "@/lib/types/db";

function log(nutriments: Record<string, number> | null): FoodLog {
  return {
    id: "x", client_id: "c", log_date: "2026-07-20", logged_at: "t", barcode: null,
    name: "f", brand: null, grams: 100, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
    nutriments, source: "manual", created_at: "t",
  };
}

describe("micronutrients", () => {
  it("scales per-100g micros to the amount eaten and drops the macro keys", () => {
    const scaled = scaleNutriments(
      { energy_kcal: 265, proteins: 9, carbohydrates: 49, fat: 3, fiber: 2.7, sodium: 0.49 },
      50,
    );
    expect(scaled.fiber).toBeCloseTo(1.35, 3);
    expect(scaled.sodium).toBeCloseTo(0.245, 3);
    // Macros are stored in their own columns, not the micro map.
    expect(scaled.energy_kcal).toBeUndefined();
    expect(scaled.proteins).toBeUndefined();
  });

  it("returns {} for missing/zero grams (never NaN)", () => {
    expect(scaleNutriments(null, 100)).toEqual({});
    expect(scaleNutriments({ fiber: 3 }, 0)).toEqual({});
  });

  it("sums micros across a day's logs, ignoring logs without micros", () => {
    const total = sumMicros([
      log({ fiber: 2, sodium: 0.3 }),
      log({ fiber: 1.5, calcium: 0.1 }),
      log(null),
    ]);
    expect(total.fiber).toBeCloseTo(3.5, 3);
    expect(total.sodium).toBeCloseTo(0.3, 3);
    expect(total.calcium).toBeCloseTo(0.1, 3);
  });

  it("formats grams as g and minerals as mg", () => {
    const fiber = DISPLAY_MICROS.find((d) => d.key === "fiber")!;
    const sodium = DISPLAY_MICROS.find((d) => d.key === "sodium")!;
    expect(formatMicro(fiber, 3.25)).toBe("3.3 g");
    expect(formatMicro(sodium, 0.49)).toBe("490 mg");
  });

  it("only surfaces micros that actually have data today", () => {
    const rows = presentMicros({ fiber: 3, sodium: 0.2, calcium: 0 });
    const keys = rows.map((r) => r.def.key);
    expect(keys).toContain("fiber");
    expect(keys).toContain("sodium");
    expect(keys).not.toContain("calcium"); // zero → hidden
    expect(keys).not.toContain("iron"); // absent → hidden
  });
});

describe("essential micro goals", () => {
  function goalFor(key: string, calories: number, sex: "male" | "female" | null) {
    return buildMicroGoals({}, calories, sex).find((r) => r.def.key === key)!;
  }

  it("covers the full essential vitamin + mineral panel", () => {
    const keys = ESSENTIAL_MICROS.map((m) => m.key);
    for (const k of ["vitamin-a", "vitamin-c", "vitamin-d", "vitamin-b12", "calcium", "iron", "potassium", "magnesium", "zinc"]) {
      expect(keys).toContain(k);
    }
    expect(ESSENTIAL_MICROS.length).toBeGreaterThanOrEqual(20);
  });

  it("keeps vitamin goals fixed regardless of calorie target (2000-cal DV)", () => {
    expect(goalFor("vitamin-c", 2000, "male").goal).toBe(90);
    expect(goalFor("vitamin-c", 1000, "male").goal).toBe(90); // not reduced at low cals
    expect(goalFor("calcium", 1200, "female").goal).toBe(1300);
  });

  it("sets iron by sex", () => {
    expect(goalFor("iron", 2000, "female").goal).toBe(18);
    expect(goalFor("iron", 2000, "male").goal).toBe(8);
  });

  it("scales fiber to calories (14 g / 1000 kcal)", () => {
    expect(goalFor("fiber", 2000, null).goal).toBe(28);
    expect(goalFor("fiber", 1000, null).goal).toBe(14);
  });

  it("computes the saturated-fat cap as 10% of calories", () => {
    const cap = goalFor("saturated-fat", 1800, null);
    expect(cap.kind).toBe("limit");
    expect(cap.goal).toBe(Math.round((0.1 * 1800) / 9)); // 20 g
  });

  it("converts consumed grams to the display unit", () => {
    // 0.09 g vitamin C stored -> 90 mg consumed.
    const row = buildMicroGoals({ "vitamin-c": 0.09 }, 2000, "male").find((r) => r.def.key === "vitamin-c")!;
    expect(row.consumed).toBe(90);
    // 0.5 g sodium -> 500 mg.
    const na = buildMicroGoals({ sodium: 0.5 }, 2000, "male").find((r) => r.def.key === "sodium")!;
    expect(na.consumed).toBe(500);
  });
});
