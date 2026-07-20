import { describe, expect, it } from "vitest";
import { starterHabits } from "@/lib/habits/starter";

describe("starter habits from intake", () => {
  it("always includes the base daily anchors", () => {
    const names = starterHabits("maintain", "moderate").map((h) => h.name);
    expect(names).toContain("Log your meals");
    expect(names).toContain("Hit your water goal");
    expect(names).toContain("7+ hours of sleep");
  });

  it("always includes a steps habit and an activity habit", () => {
    for (const goal of ["lose", "maintain", "gain", "recomp", "habits_only"] as const) {
      const seeds = starterHabits(goal, "moderate");
      const steps = seeds.find((h) => h.unit === "steps");
      expect(steps, `steps for ${goal}`).toBeTruthy();
      expect(steps?.type).toBe("counter");
      // An explicit movement/activity session too.
      expect(seeds.some((h) => h.category === "movement" && h.unit !== "steps"), `activity for ${goal}`).toBe(true);
    }
  });

  it("bumps the step target for fat loss", () => {
    expect(starterHabits("lose", "moderate").find((h) => h.unit === "steps")?.target).toBe(10000);
    expect(starterHabits("maintain", "moderate").find((h) => h.unit === "steps")?.target).toBe(8000);
  });

  it("keeps the protein anchor for non-habits-only goals", () => {
    expect(starterHabits("lose", "moderate").map((h) => h.name)).toContain("Protein with every meal");
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

  it("are all daily and capped at seven", () => {
    const seeds = starterHabits("gain", "sedentary");
    expect(seeds.length).toBeLessThanOrEqual(7);
    expect(seeds.every((h) => h.cadence === "daily")).toBe(true);
  });
});
