import { describe, expect, it } from "vitest";
import { kgToLb, lbToKg, trendChangeKg, weightTrend } from "@/lib/body/trend";
import type { BodyMeasurement } from "@/lib/types/db";

function m(date: string, weight: number | null): BodyMeasurement {
  return {
    id: date, client_id: "c", log_date: date, weight_kg: weight, body_fat_pct: null,
    waist_cm: null, hips_cm: null, notes: null, created_at: date,
  };
}

describe("body weight trend", () => {
  it("computes a trailing moving average and sorts by date", () => {
    const trend = weightTrend([m("2026-07-03", 82), m("2026-07-01", 80), m("2026-07-02", 84)], 3);
    expect(trend.map((t) => t.date)).toEqual(["2026-07-01", "2026-07-02", "2026-07-03"]);
    expect(trend[0].avgKg).toBe(80);
    expect(trend[1].avgKg).toBe(82); // (80+84)/2
    expect(trend[2].avgKg).toBe(82); // (80+84+82)/3
  });

  it("ignores entries with no weight", () => {
    const trend = weightTrend([m("2026-07-01", 80), m("2026-07-02", null)], 7);
    expect(trend).toHaveLength(1);
  });

  it("reports the smoothed change and handles too-few points", () => {
    const trend = weightTrend([m("2026-07-01", 80), m("2026-07-10", 78)], 1);
    expect(trendChangeKg(trend)).toBe(-2);
    expect(trendChangeKg([])).toBe(0);
  });

  it("converts kg and lb round-trip", () => {
    expect(kgToLb(100)).toBeCloseTo(220.5, 1);
    expect(lbToKg(220.46)).toBeCloseTo(100, 1);
  });
});
