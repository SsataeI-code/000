import { describe, expect, it } from "vitest";
import { recommendNextHabit, readyForNextHabit, type HabitRecInput } from "@/lib/habits/recommend";

const base = (over: Partial<HabitRecInput>): HabitRecInput => ({
  goal: "lose",
  activity: "moderate",
  existing: [],
  ...over,
});

describe("adaptive habit recommendation", () => {
  it("suggests nothing until the client has at least one habit", () => {
    expect(recommendNextHabit(base({ existing: [] }))).toBeNull();
  });

  it("waits until the newest habit has stuck (age + consistency)", () => {
    // A fresh, shaky habit → not ready.
    expect(readyForNextHabit(base({ existing: [{ category: "movement", consistency: 0.9, ageDays: 4 }] }))).toBe(false);
    expect(readyForNextHabit(base({ existing: [{ category: "movement", consistency: 0.3, ageDays: 30 }] }))).toBe(false);
    // Established and consistent → ready.
    expect(readyForNextHabit(base({ existing: [{ category: "movement", consistency: 0.8, ageDays: 20 }] }))).toBe(true);
  });

  it("recommends the top-priority missing category for the goal", () => {
    // Fat loss: nutrition is first priority; they only have movement.
    const rec = recommendNextHabit(base({ goal: "lose", existing: [{ category: "movement", consistency: 0.8, ageDays: 20 }] }));
    expect(rec?.category).toBe("nutrition");
    expect(rec?.name).toBeTruthy();
    expect(rec?.why).toBeTruthy();
  });

  it("respects a different goal's priority order", () => {
    // Habits-only leads with sleep.
    const rec = recommendNextHabit(base({ goal: "habits_only", existing: [{ category: "movement", consistency: 0.8, ageDays: 20 }] }));
    expect(rec?.category).toBe("sleep");
  });

  it("skips categories the client already has", () => {
    const rec = recommendNextHabit(
      base({ goal: "lose", existing: [
        { category: "nutrition", consistency: 0.8, ageDays: 20 },
        { category: "movement", consistency: 0.8, ageDays: 25 },
      ] }),
    );
    expect(rec?.category).toBe("sleep"); // nutrition + movement covered → next is sleep
  });

  it("pauses when the client is well-rounded or overloaded", () => {
    const allCats = (["nutrition", "movement", "sleep", "mindfulness", "recovery", "hydration"] as const).map((c) => ({
      category: c, consistency: 0.8, ageDays: 30,
    }));
    // 6 habits → overloaded cap; also every category covered.
    expect(recommendNextHabit(base({ existing: allCats }))).toBeNull();
  });

  it("gates on the NEWEST habit, not the oldest", () => {
    // Old solid habit + brand-new shaky one → not ready yet.
    const input = base({ existing: [
      { category: "movement", consistency: 0.9, ageDays: 40 },
      { category: "nutrition", consistency: 0.9, ageDays: 3 },
    ] });
    expect(readyForNextHabit(input)).toBe(false);
  });
});
