import type { Habit } from "@/lib/types/db";

/** Habit streak / consistency math (§5A). Pure and calendar-based. */

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

/** Is the habit scheduled on this date, given its cadence? */
export function isScheduledOn(
  habit: Pick<Habit, "cadence" | "days_of_week">,
  date: Date,
): boolean {
  switch (habit.cadence) {
    case "specific_days":
      return (habit.days_of_week ?? []).includes(date.getUTCDay());
    case "weekly_count":
    case "daily":
    default:
      return true; // schedulable any day; weekly_count tracks a weekly target
  }
}

/**
 * Streak freeze budget (§5A "forgiving miss-recovery") — how many missed
 * scheduled days a current streak survives before it breaks. One slip won't
 * wipe a long chain; a second consecutive miss still does. Never shaming.
 */
export const FREEZE_BUDGET = 1;

/**
 * Current streak — consecutive scheduled days completed, ending today (or
 * yesterday if today isn't done yet, so an unfinished today never breaks it).
 * `freezes` missed scheduled days are forgiven (they're skipped, not counted);
 * the streak only breaks once the budget is spent (default 0 = strict).
 */
export function currentStreak(
  habit: Pick<Habit, "cadence" | "days_of_week">,
  completed: Set<string>,
  today: Date,
  freezes = 0,
): number {
  let streak = 0;
  let budget = freezes;
  let d = new Date(today);

  if (isScheduledOn(habit, d) && !completed.has(isoDate(d))) {
    d = addDays(d, -1); // grace: today not done yet
  }

  for (let i = 0; i < 400; i++) {
    if (isScheduledOn(habit, d)) {
      if (completed.has(isoDate(d))) streak++;
      else if (budget > 0) budget--; // frozen: forgive this miss, don't count it
      else break;
    }
    d = addDays(d, -1);
  }
  return streak;
}

/** True when a streak freeze is currently protecting this habit's chain. */
export function isStreakFrozen(
  habit: Pick<Habit, "cadence" | "days_of_week">,
  completed: Set<string>,
  today: Date,
  freezes = FREEZE_BUDGET,
): boolean {
  return currentStreak(habit, completed, today, freezes) > currentStreak(habit, completed, today, 0);
}

/** Longest run of consecutive completed calendar days on record. */
export function longestStreak(completed: Set<string>): number {
  if (completed.size === 0) return 0;
  const dates = [...completed].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(`${dates[i - 1]}T00:00:00Z`);
    const cur = new Date(`${dates[i]}T00:00:00Z`);
    const gap = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    run = gap === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/** Consistency over the last `windowDays` (0..1): completed ÷ scheduled. */
export function consistency(
  habit: Pick<Habit, "cadence" | "days_of_week" | "times_per_week">,
  completed: Set<string>,
  today: Date,
  windowDays = 30,
): number {
  if (habit.cadence === "weekly_count") {
    const expected = Math.round((windowDays / 7) * (habit.times_per_week ?? 1));
    let done = 0;
    for (let i = 0; i < windowDays; i++) {
      if (completed.has(isoDate(addDays(today, -i)))) done++;
    }
    return expected > 0 ? Math.min(1, done / expected) : 0;
  }

  let scheduled = 0;
  let done = 0;
  for (let i = 0; i < windowDays; i++) {
    const d = addDays(today, -i);
    if (!isScheduledOn(habit, d)) continue;
    scheduled++;
    if (completed.has(isoDate(d))) done++;
  }
  return scheduled > 0 ? done / scheduled : 0;
}

/** Completions this ISO-ish week (last 7 days incl. today) — for weekly_count. */
export function weekProgress(completed: Set<string>, today: Date): number {
  let n = 0;
  for (let i = 0; i < 7; i++) if (completed.has(isoDate(addDays(today, -i)))) n++;
  return n;
}

/** Should this habit appear on today's check-off list? */
export function isDueToday(
  habit: Pick<Habit, "cadence" | "days_of_week" | "times_per_week">,
  completed: Set<string>,
  today: Date,
): boolean {
  if (habit.cadence === "specific_days") return isScheduledOn(habit, today);
  if (habit.cadence === "weekly_count") {
    // Show until the weekly target is met (or if already done today).
    if (completed.has(isoDate(today))) return true;
    return weekProgress(completed, today) < (habit.times_per_week ?? 1);
  }
  return true; // daily
}
