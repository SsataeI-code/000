import { describe, expect, it } from "vitest";
import { starterHabits } from "@/lib/habits/starter";

describe("starter habits from intake", () => {
  it("always includes the base daily anchors", () => {
    const names = starterHabits("maintain", "moderate").map((h) => h.name);
    expect(names).toContain("Log your meals");
    expect(names).toContain("Hit your water goal");
    expect(names).toContain("7+ hours of sleep");
  });

  it("tailors movement + protein to a fat-loss goal", () => {
    const seeds = starterHabits("lose", "moderate");
    const names = seeds.map((h) => h.name);
    expect(names).toContain("Protein with every meal");
    const steps = seeds.find((h) => h.name === "8,000 steps");
    expect(steps?.type).toBe("counter");
    expect(steps?.target).toBe(8000);
  });

  it("adds a surplus nudge for muscle gain", () => {
    const names = starterHabits("gain", "light").map((h) => h.name);
    expect(names).toContain("Eat a 4th meal or snack");
  });

  it("keeps habits-only gentle (no protein rule, adds a walk + mindfulness)", () => {
    const names = starterHabits("habits_only", "light").map((h) => h.name);
    expect(names).not.toContain("Protein with every meal");
    expect(names).toContain("10-minute walk");
    expect(names).toContain("One mindful minute");
  });

  it("adjusts for activity level", () => {
    expect(starterHabits("maintain", "sedentary").map((h) => h.name)).toContain("Stand and move every hour");
    expect(starterHabits("maintain", "athlete").map((h) => h.name)).toContain("Stretch or mobility");
  });

  it("are all daily and capped at six", () => {
    const seeds = starterHabits("gain", "sedentary");
    expect(seeds.length).toBeLessThanOrEqual(6);
    expect(seeds.every((h) => h.cadence === "daily")).toBe(true);
  });
});
