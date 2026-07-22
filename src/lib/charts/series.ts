import type { FoodLog, Habit } from "@/lib/types/db";
import { isoDate, addDays, isScheduledOn } from "@/lib/habits/streaks";

/**
 * Chart series math (§9 "statistics", §5C trends). Pure and calendar-based so
 * the same helpers feed an individual's graphs and roster-wide aggregates, and
 * every one is unit-tested without a database.
 */

export interface SeriesPoint {
  date: string;
  value: number | null; // null = no data that day (drawn as a gap, not a zero)
}

/** The last `n` calendar dates (ISO), oldest first, ending today. */
export function lastNDates(n: number, today: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(isoDate(addDays(today, -i)));
  return out;
}

/** Sum a numeric field of dated rows per day, aligned to `dates` (0 when none). */
export function dailySum<T extends { log_date: string }>(
  rows: T[],
  pick: (row: T) => number,
  dates: string[],
): SeriesPoint[] {
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.log_date, (totals.get(r.log_date) ?? 0) + (pick(r) || 0));
  return dates.map((date) => ({ date, value: Math.round(totals.get(date) ?? 0) }));
}

/** Daily calories logged, aligned to `dates`. */
export function dailyCalories(logs: FoodLog[], dates: string[]): SeriesPoint[] {
  return dailySum(logs, (l) => Number(l.calories) || 0, dates);
}

/** Daily grams of a macro logged, aligned to `dates`. */
export function dailyMacro(logs: FoodLog[], key: "protein_g" | "carbs_g" | "fat_g", dates: string[]): SeriesPoint[] {
  return dailySum(logs, (l) => Number(l[key]) || 0, dates);
}

/**
 * Daily habit consistency 0..1: completed habits ÷ habits actually due that day
 * (cadence-aware). A day with nothing due is null (no bar), never a false 0.
 */
export function dailyConsistency(
  habits: Habit[],
  completedByHabit: Map<string, Set<string>>,
  dates: string[],
): SeriesPoint[] {
  return dates.map((date) => {
    const d = new Date(`${date}T00:00:00Z`);
    let due = 0;
    let done = 0;
    for (const h of habits) {
      if (!isScheduledOn(h, d)) continue;
      due++;
      if (completedByHabit.get(h.id)?.has(date)) done++;
    }
    return { date, value: due === 0 ? null : Math.round((done / due) * 100) / 100 };
  });
}

/** Mean of the non-null values in a series, or null if all empty. */
export function seriesMean(series: SeriesPoint[]): number | null {
  const vals = series.map((p) => p.value).filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Average two or more aligned series point-by-point (for roster aggregates). */
export function averageSeries(all: SeriesPoint[][], dates: string[]): SeriesPoint[] {
  return dates.map((date, i) => {
    const vals = all.map((s) => s[i]?.value).filter((v): v is number => v != null);
    return { date, value: vals.length === 0 ? null : vals.reduce((a, b) => a + b, 0) / vals.length };
  });
}

/** Days on which the client logged any food (for a "logged N of last M days" stat). */
export function daysLogged(series: SeriesPoint[]): number {
  return series.filter((p) => (p.value ?? 0) > 0).length;
}
