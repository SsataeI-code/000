import { describe, expect, it } from "vitest";
import { computeAttention, type AttentionInput } from "@/lib/coach/attention";

const ok: AttentionInput = {
  daysSinceActivity: 0,
  daysSinceFood: 0,
  daysSinceHabit: 0,
  hasHabits: true,
  goal: "lose",
  weightChangeKg: 0,
  hasWeightTrend: true,
};

describe("needs-attention scoring", () => {
  it("flags nobody when the client is active and on track", () => {
    const r = computeAttention(ok);
    expect(r.flags).toEqual([]);
    expect(r.score).toBe(0);
  });

  it("flags a client who's gone quiet, harder after a week", () => {
    expect(computeAttention({ ...ok, daysSinceActivity: 4, daysSinceFood: 4, daysSinceHabit: 4 }).flags[0].kind).toBe("quiet");
    const week = computeAttention({ ...ok, daysSinceActivity: 8, daysSinceFood: 8, daysSinceHabit: 8 });
    expect(week.score).toBeGreaterThan(computeAttention({ ...ok, daysSinceActivity: 4, daysSinceFood: 4, daysSinceHabit: 4 }).score);
  });

  it("flags stopped-logging-food while still active", () => {
    const r = computeAttention({ ...ok, daysSinceActivity: 1, daysSinceFood: 4, daysSinceHabit: 0 });
    expect(r.flags.some((f) => f.kind === "no_food")).toBe(true);
  });

  it("flags missed habits only when they have habits and are otherwise active", () => {
    const r = computeAttention({ ...ok, daysSinceActivity: 1, daysSinceFood: 0, daysSinceHabit: 3 });
    expect(r.flags.some((f) => f.kind === "missed_habits")).toBe(true);
    const noHabits = computeAttention({ ...ok, hasHabits: false, daysSinceActivity: 1, daysSinceHabit: 3 });
    expect(noHabits.flags.some((f) => f.kind === "missed_habits")).toBe(false);
  });

  it("flags weight moving against the goal", () => {
    expect(computeAttention({ ...ok, weightChangeKg: 1.2, goal: "lose" }).flags.some((f) => f.kind === "weight_off")).toBe(true);
    expect(computeAttention({ ...ok, weightChangeKg: -1.2, goal: "gain" }).flags.some((f) => f.kind === "weight_off")).toBe(true);
    // Losing weight on a fat-loss goal is good — no flag.
    expect(computeAttention({ ...ok, weightChangeKg: -1.2, goal: "lose" }).flags.some((f) => f.kind === "weight_off")).toBe(false);
  });

  it("scores a silent client above a merely-missed-habit one", () => {
    const silent = computeAttention({ ...ok, daysSinceActivity: 9, daysSinceFood: 9, daysSinceHabit: 9 });
    const missed = computeAttention({ ...ok, daysSinceActivity: 1, daysSinceHabit: 2 });
    expect(silent.score).toBeGreaterThan(missed.score);
  });
});
