import { describe, it, expect } from "vitest";
import { pickStepHabit, stepCheckoffs } from "@/lib/wearables/steps";
import type { Habit } from "@/lib/types/db";

const habit = (over: Partial<Habit>): Habit => ({
  id: "h1",
  client_id: "c1",
  name: "10,000 steps",
  category: "movement",
  type: "counter",
  target: 10000,
  unit: "steps",
  cadence: "daily",
  times_per_week: null,
  days_of_week: null,
  reminder_time: null,
  why: null,
  anchor: null,
  position: 0,
  active: true,
  created_by: null,
  created_at: "",
  updated_at: "",
  ...over,
});

describe("pickStepHabit", () => {
  it("prefers a habit with unit 'steps'", () => {
    const habits = [habit({ id: "a", name: "Walk", unit: null }), habit({ id: "b", unit: "steps" })];
    expect(pickStepHabit(habits)?.id).toBe("b");
  });

  it("falls back to a name mentioning steps", () => {
    expect(pickStepHabit([habit({ id: "x", name: "8k steps", unit: "count" })])?.id).toBe("x");
  });

  it("ignores inactive habits and returns null when none match", () => {
    expect(pickStepHabit([habit({ unit: "steps", active: false })])).toBeNull();
    expect(pickStepHabit([habit({ name: "Drink water", unit: "ml" })])).toBeNull();
  });
});

describe("stepCheckoffs", () => {
  const h = habit({ target: 10000 });

  it("checks off only days that meet the target and aren't done", () => {
    const metrics = [
      { day: "2026-08-01", steps: 12000 }, // meets
      { day: "2026-08-02", steps: 4000 }, // short
      { day: "2026-08-03", steps: 10000 }, // meets (>=)
    ];
    const out = stepCheckoffs(h, metrics, new Set(["2026-08-03"])); // 3rd already done
    expect(out).toEqual([{ habitId: "h1", day: "2026-08-01", value: 12000 }]);
  });

  it("skips days with no step data", () => {
    expect(stepCheckoffs(h, [{ day: "2026-08-01", sleepMinutes: 400 }], new Set())).toEqual([]);
  });

  it("treats any recorded steps as a win when the habit has no target", () => {
    const out = stepCheckoffs(habit({ target: null }), [{ day: "2026-08-01", steps: 1 }], new Set());
    expect(out).toHaveLength(1);
  });
});
