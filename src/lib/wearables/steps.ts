import type { Habit } from "@/lib/types/db";
import type { DailyMetric } from "@/lib/wearables/parse";

/**
 * Steps → habit auto-check (§7 "surfacing synced steps into the client's step
 * habit"). Pure and tested: pick the client's steps habit, then decide which
 * synced days meet its target and aren't already checked off. The sync writes
 * the resulting habit_logs so a client whose tracker reports a big day gets their
 * steps habit ticked automatically — no double-work, and never un-ticks a day.
 */

/** Find the client's active steps habit — by unit "steps", else a name mentioning steps. */
export function pickStepHabit(habits: Habit[]): Habit | null {
  const active = habits.filter((h) => h.active);
  return (
    active.find((h) => (h.unit ?? "").toLowerCase() === "steps") ??
    active.find((h) => /\bsteps?\b/i.test(h.name)) ??
    null
  );
}

export interface StepCheckoff {
  habitId: string;
  day: string;
  value: number;
}

/**
 * The days whose synced steps meet the habit's target and aren't already done.
 * A habit with no positive target counts any day with steps recorded. Only
 * whole, met days are returned — the auto-check never overwrites an existing
 * completion and never marks an incomplete day.
 */
export function stepCheckoffs(habit: Habit, metrics: DailyMetric[], alreadyDone: Set<string>): StepCheckoff[] {
  const target = habit.target && habit.target > 0 ? habit.target : 1;
  const out: StepCheckoff[] = [];
  for (const m of metrics) {
    if (m.steps == null) continue;
    if (m.steps >= target && !alreadyDone.has(m.day)) {
      out.push({ habitId: habit.id, day: m.day, value: m.steps });
    }
  }
  return out;
}
