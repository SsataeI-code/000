import { describe, expect, it } from "vitest";
import {
  computeXp,
  levelForXp,
  streakBonusFor,
  computeAchievements,
  computeGameState,
  perfectDayCount,
  comebackCount,
  type GameStats,
} from "@/lib/habits/game";
import type { Habit } from "@/lib/types/db";

function habit(over: Partial<Habit>): Habit {
  return {
    id: "h", client_id: "c", name: "n", category: "movement", type: "checkbox",
    target: null, unit: null, cadence: "daily", times_per_week: null, days_of_week: null,
    reminder_time: null, why: null, anchor: null, position: 0, active: true,
    created_by: null, created_at: "", updated_at: "", ...over,
  };
}

const baseStats: GameStats = {
  totalCompletions: 0, perHabitLongest: [], bestStreak: 0, bestCurrentStreak: 0,
  perfectDays: 0, comebacks: 0, habitCount: 0, todayDone: 0, todayDue: 0,
};

describe("habit game — XP & levels", () => {
  it("streakBonusFor accumulates crossed milestones", () => {
    expect(streakBonusFor(0)).toBe(0);
    expect(streakBonusFor(3)).toBe(30);
    expect(streakBonusFor(7)).toBe(100); // 30 + 70
    expect(streakBonusFor(30)).toBe(30 + 70 + 140 + 300);
  });

  it("computeXp = completions×10 + per-habit streak bonuses", () => {
    expect(computeXp({ totalCompletions: 12, perHabitLongest: [7, 3] })).toBe(120 + 100 + 30);
  });

  it("levelForXp finds the band and progress to next", () => {
    const l0 = levelForXp(0);
    expect(l0.name).toBe("Spark");
    expect(l0.level).toBe(1);
    expect(l0.progress).toBe(0);

    const mid = levelForXp(425); // between 250 (Kindling) and 600 (Steady)
    expect(mid.name).toBe("Kindling");
    expect(mid.into).toBe(175);
    expect(mid.span).toBe(350);
    expect(mid.toNext).toBe(175);
    expect(mid.progress).toBeCloseTo(0.5, 5);

    const top = levelForXp(999999);
    expect(top.name).toBe("Legend");
    expect(top.nextName).toBeNull();
    expect(top.progress).toBe(1);
    expect(top.toNext).toBeNull();
  });
});

describe("habit game — achievements", () => {
  it("unlocks by threshold", () => {
    const a = computeAchievements({ ...baseStats, totalCompletions: 1 });
    expect(a.find((x) => x.id === "first_step")?.earned).toBe(true);
    expect(a.find((x) => x.id === "fifty_club")?.earned).toBe(false);

    const b = computeAchievements({ ...baseStats, bestStreak: 30, perfectDays: 7, comebacks: 2, habitCount: 5, totalCompletions: 60 });
    for (const id of ["week_warrior", "month_master", "perfect_day", "perfect_week", "comeback", "builder", "fifty_club"]) {
      expect(b.find((x) => x.id === id)?.earned).toBe(true);
    }
    expect(b.find((x) => x.id === "centurion")?.earned).toBe(false);
  });

  it("computeGameState rolls it all up incl. today's points", () => {
    const s = computeGameState({ ...baseStats, totalCompletions: 25, perHabitLongest: [7], todayDone: 3, todayDue: 4 });
    expect(s.xp).toBe(250 + 100);
    expect(s.levelName).toBe("Kindling"); // 350 xp ≥ 250
    expect(s.todayPoints).toBe(30);
    expect(s.earnedCount).toBeGreaterThan(0);
  });
});

describe("habit game — perfect days & comebacks", () => {
  it("counts a day perfect only when every due habit is done", () => {
    const a = habit({ id: "a" });
    const b = habit({ id: "b" });
    const completed = new Map([
      ["a", new Set(["2026-01-01", "2026-01-02"])],
      ["b", new Set(["2026-01-01"])], // b missed on the 2nd
    ]);
    // 01-01 both done => perfect; 01-02 only a done => not perfect.
    expect(perfectDayCount([a, b], completed)).toBe(1);
  });

  it("ignores habits not scheduled that day when judging perfection", () => {
    const daily = habit({ id: "a" });
    const sunOnly = habit({ id: "b", cadence: "specific_days", days_of_week: [0] });
    // 2026-01-05 is a Monday — sunOnly isn't due, so daily alone makes it perfect.
    const completed = new Map([["a", new Set(["2026-01-05"])]]);
    expect(perfectDayCount([daily, sunOnly], completed)).toBe(1);
  });

  it("counts comebacks as resumptions after a gap", () => {
    const completed = new Map([
      ["a", new Set(["2026-01-01", "2026-01-02", "2026-01-10", "2026-01-11"])], // one gap => 1 comeback
      ["b", new Set(["2026-01-01"])], // single day => 0
    ]);
    expect(comebackCount(completed)).toBe(1);
  });
});
