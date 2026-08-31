import { describe, it, expect } from "vitest";
import { balanceMacros, caloriesFromMacros, macroPercents, ratioOf, macrosAtCalories } from "@/lib/nutrition/macros";

describe("balanceMacros", () => {
  const base = { calories: 2000, proteinG: 150, carbsG: 200, fatG: 56 };

  it("scales all macros when calories change, holding the ratio", () => {
    const start = { calories: 1596, proteinG: 100, carbsG: 200, fatG: 44 }; // implied 1596
    const ratio = ratioOf(start);
    const out = balanceMacros({ ...start, calories: 3192 }, "calories", ratio); // double
    expect(out.calories).toBe(3192);
    expect(out.proteinG).toBe(200);
    expect(out.carbsG).toBe(400);
    expect(out.fatG).toBe(88);
  });

  it("stays stable when calories are edited digit-by-digit (no collapse to zero)", () => {
    const ratio = ratioOf(base); // captured once from real macros
    // simulate typing "3" then "30" ... "3000" — each recomputes from the SAME ratio
    let out = { ...base };
    for (const c of [3, 30, 300, 3000]) out = balanceMacros({ ...out, calories: c }, "calories", ratio);
    expect(out.calories).toBe(3000);
    expect(out.proteinG).toBeGreaterThan(0);
    expect(out.carbsG).toBeGreaterThan(0);
    expect(out.fatG).toBeGreaterThan(0);
  });

  it("recomputes calories when a macro changes; other macros untouched", () => {
    const out = balanceMacros({ calories: 999, proteinG: 150, carbsG: 200, fatG: 60 }, "proteinG");
    expect(out.calories).toBe(150 * 4 + 200 * 4 + 60 * 9); // 1940
    expect(out.carbsG).toBe(200);
    expect(out.fatG).toBe(60);
  });

  it("uses a sensible default ratio when there are no macros yet", () => {
    const out = balanceMacros({ calories: 2000, proteinG: 0, carbsG: 0, fatG: 0 }, "calories");
    expect(out.calories).toBe(2000);
    expect(out.proteinG).toBeGreaterThan(0); // default split fills them
  });

  it("macrosAtCalories respects a ratio", () => {
    const m = macrosAtCalories(2000, { protein: 0.3, carbs: 0.4, fat: 0.3 });
    expect(m.proteinG).toBe(150); // 2000*0.3/4
    expect(m.carbsG).toBe(200); // 2000*0.4/4
    expect(m.fatG).toBe(67); // 2000*0.3/9 ≈ 66.7
  });

  it("caloriesFromMacros and macroPercents agree", () => {
    expect(caloriesFromMacros(base)).toBe(150 * 4 + 200 * 4 + 56 * 9);
    const p = macroPercents(base);
    expect(p.protein + p.carbs + p.fat).toBeGreaterThanOrEqual(99);
    expect(p.protein + p.carbs + p.fat).toBeLessThanOrEqual(101);
  });
});
