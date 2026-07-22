import type { Goal } from "@/lib/types/db";

/**
 * "Needs Attention" scoring (§9). Anyone who trips a flag floats to the top of
 * the coach's queue, most urgent first. Pure and testable — the data layer feeds
 * it simple metrics, this decides what matters.
 */

export type FlagKind = "quiet" | "no_food" | "missed_habits" | "weight_off";

export interface AttentionFlag {
  kind: FlagKind;
  label: string;
  severity: number; // higher = more urgent
}

export interface AttentionInput {
  /** Days since ANY app activity (food/habit/water log). Infinity if never. */
  daysSinceActivity: number;
  /** Days since the last food log. Infinity if never. */
  daysSinceFood: number;
  /** Days since the last habit check-in. Infinity if never. */
  daysSinceHabit: number;
  hasHabits: boolean;
  goal: Goal;
  /** Recent smoothed weight change (kg) over the tracking window; 0 if unknown. */
  weightChangeKg: number;
  /** Whether we have enough weight data to judge the trend. */
  hasWeightTrend: boolean;
}

export interface AttentionResult {
  flags: AttentionFlag[];
  score: number;
}

/** Decide a client's attention flags + overall urgency score. */
export function computeAttention(input: AttentionInput): AttentionResult {
  const flags: AttentionFlag[] = [];

  // Gone quiet — hasn't used the app at all. A week silent is a big deal (§9).
  if (input.daysSinceActivity >= 7) {
    flags.push({ kind: "quiet", label: `Silent ${Math.floor(input.daysSinceActivity)}d`, severity: 60 });
  } else if (input.daysSinceActivity >= 3) {
    flags.push({ kind: "quiet", label: `Quiet ${Math.floor(input.daysSinceActivity)}d`, severity: 30 });
  }

  // Stopped logging food (but may still be opening the app).
  if (input.daysSinceActivity < 3 && input.daysSinceFood >= 3) {
    flags.push({
      kind: "no_food",
      label: `No food log ${Math.floor(input.daysSinceFood)}d`,
      severity: 25,
    });
  }

  // Missed habits — has habits but hasn't checked any in a couple of days.
  if (input.hasHabits && input.daysSinceActivity < 3 && input.daysSinceHabit >= 2) {
    flags.push({
      kind: "missed_habits",
      label: `Habits missed ${Math.floor(input.daysSinceHabit)}d`,
      severity: 20,
    });
  }

  // Weight trending against the goal over the tracking window.
  if (input.hasWeightTrend) {
    const c = input.weightChangeKg;
    if ((input.goal === "lose" && c > 0.5) || (input.goal === "gain" && c < -0.5)) {
      flags.push({ kind: "weight_off", label: "Weight off-track", severity: 22 });
    }
  }

  const score = flags.reduce((s, f) => s + f.severity, 0);
  return { flags, score };
}
