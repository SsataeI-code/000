import { describe, expect, it } from "vitest";
import {
  addDays,
  consistency,
  currentStreak,
  isDueToday,
  isoDate,
  isScheduledOn,
  longestStreak,
  weekProgress,
} from "@/lib/habits/streaks";
import type { Habit } from "@/lib/types/db";

const TODAY = new Date("2026-07-20T12:00:00Z"); // a Monday (UTC day = 1)
function set(...offsets: number[]): Set<string> {
  return new Set(offsets.map((o) => isoDate(addDays(TODAY, -o))));
}
const daily = { cadence: "daily" as const, days_of_week: null, times_per_week: null };

describe("habit streaks", () => {
  it("counts consecutive completed days for a daily habit", () => {
    expect(currentStreak(daily, set(0, 1, 2, 3), TODAY)).toBe(4);
    expect(currentStreak(daily, set(0, 1, 3), TODAY)).toBe(2); // gap at 2 breaks it
  });

  it("gives grace when today isn't done yet (streak continues from yesterday)", () => {
    expect(currentStreak(daily, set(1, 2, 3), TODAY)).toBe(3);
  });

  it("returns 0 when there's a fresh miss", () => {
    expect(currentStreak(daily, set(2, 3), TODAY)).toBe(0); // yesterday missed
  });

  it("respects specific-days cadence (non-scheduled days don't break it)", () => {
    // Mon/Wed/Fri habit. TODAY is Monday (1).
    const mwf = { cadence: "specific_days" as const, days_of_week: [1, 3, 5], times_per_week: null };
    // Completed this Mon, last Fri, last Wed, last Mon → 4 scheduled in a row.
    const done = set(0, 3, 5, 7); // Mon, Fri, Wed, Mon
    expect(currentStreak(mwf, done, TODAY)).toBe(4);
    expect(isScheduledOn(mwf, TODAY)).toBe(true);
    expect(isScheduledOn(mwf, addDays(TODAY, -1))).toBe(false); // Sunday
  });

  it("finds the longest run on record", () => {
    expect(longestStreak(set(0, 1, 2, 10, 11))).toBe(3);
    expect(longestStreak(new Set())).toBe(0);
  });

  it("computes consistency over a window", () => {
    expect(consistency(daily, set(0, 1, 2, 3, 4), TODAY, 10)).toBeCloseTo(0.5, 5);
  });

  it("computes weekly-count consistency against the weekly target", () => {
    const weekly = { cadence: "weekly_count" as const, days_of_week: null, times_per_week: 3 };
    // 3 done in the last 7 days, window 7 → expected 3 → 100%.
    expect(consistency(weekly, set(0, 2, 4), TODAY, 7)).toBeCloseTo(1, 5);
  });

  it("decides what's due today", () => {
    expect(isDueToday(daily, new Set(), TODAY)).toBe(true);
    const weekly = { cadence: "weekly_count" as const, days_of_week: null, times_per_week: 2 };
    expect(isDueToday(weekly, set(1, 2), TODAY)).toBe(false); // target already met this week
    expect(isDueToday(weekly, set(1), TODAY)).toBe(true); // 1 of 2 → still due
    const sat = { cadence: "specific_days" as const, days_of_week: [6], times_per_week: null };
    expect(isDueToday(sat as Pick<Habit, "cadence" | "days_of_week" | "times_per_week">, new Set(), TODAY)).toBe(false); // today is Mon
  });

  it("weekProgress counts the last 7 days", () => {
    expect(weekProgress(set(0, 1, 6, 7), TODAY)).toBe(3); // day 7 is outside the window
  });
});
