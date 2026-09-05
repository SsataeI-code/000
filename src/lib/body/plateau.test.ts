import { describe, it, expect } from "vitest";
import { detectPlateau } from "@/lib/body/plateau";

// build a trend of daily points from a starting kg + per-day delta
function trend(startKg: number, perDayKg: number, days: number) {
  const out: { date: string; avgKg: number }[] = [];
  const base = Date.parse("2026-01-01T00:00:00Z");
  for (let i = 0; i < days; i++) {
    out.push({ date: new Date(base + i * 86_400_000).toISOString().slice(0, 10), avgKg: startKg + perDayKg * i });
  }
  return out;
}

describe("detectPlateau", () => {
  it("flags a stalled fat-loss client (flat ~3 weeks)", () => {
    const r = detectPlateau(trend(90, 0, 21), "lose");
    expect(r.plateaued).toBe(true);
    expect(r.weeks).toBeGreaterThanOrEqual(2);
  });

  it("does not flag steady loss", () => {
    // ~0.5 lb/week loss = ~0.032 kg/day
    const r = detectPlateau(trend(90, -0.032, 21), "lose");
    expect(r.plateaued).toBe(false);
    expect(r.ratePerWeekLb).toBeLessThan(0);
  });

  it("never plateaus a maintain goal", () => {
    expect(detectPlateau(trend(80, 0, 30), "maintain").plateaued).toBe(false);
  });

  it("needs enough span", () => {
    expect(detectPlateau(trend(90, 0, 5), "lose").plateaued).toBe(false);
  });
});
