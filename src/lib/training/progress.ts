import { e1rm } from "@/lib/lifts/progress";
import type { TrainingTrackingType } from "@/lib/types/db";

/**
 * Training progress math (Phase 3 — advanced breakdown & stats). Pure and
 * tested: turns a client's logged sets for one exercise into bests, volume, and
 * a charting series. The metric that matters depends on the exercise's tracking
 * type (estimated 1RM for lifts, reps for calisthenics, time/distance for the
 * rest), so the same component can chart any exercise honestly. No invented
 * numbers — everything derives from the sets the client actually logged.
 */

export interface SetPoint {
  date: string; // YYYY-MM-DD
  weight: number | null;
  reps: number | null;
  timeSec: number | null;
  distance: number | null;
}

export interface ExerciseSummary {
  topWeight: number | null; // heaviest single set
  topWeightReps: number | null; // reps at that heaviest set
  bestE1rm: number | null; // best estimated 1RM
  bestReps: number | null; // most reps in a set
  bestTimeSec: number | null; // longest hold / time
  bestDistance: number | null; // furthest
  totalVolume: number; // Σ weight × reps
  setCount: number;
  sessionCount: number;
  metric: "e1rm" | "weight" | "reps" | "time" | "distance";
  metricLabel: string;
  /** One point per day: the day's best value of the chosen metric. */
  series: { date: string; value: number | null }[];
}

/** Which headline metric to chart for a tracking type. */
export function metricFor(tracking: TrainingTrackingType): { metric: ExerciseSummary["metric"]; label: string } {
  switch (tracking) {
    case "weight_reps": return { metric: "e1rm", label: "Est. 1RM" };
    case "bodyweight_reps": return { metric: "reps", label: "Reps" };
    case "reps": return { metric: "reps", label: "Reps" };
    case "time": return { metric: "time", label: "Time (s)" };
    case "distance_time": return { metric: "distance", label: "Distance" };
  }
}

/** Value of the chosen metric for a single set (null when the set lacks it). */
function metricValue(metric: ExerciseSummary["metric"], s: SetPoint): number | null {
  switch (metric) {
    case "e1rm": return s.weight != null && s.reps != null ? e1rm(s.weight, s.reps) : s.weight;
    case "weight": return s.weight;
    case "reps": return s.reps;
    case "time": return s.timeSec;
    case "distance": return s.distance;
  }
}

/** Summarize all of one exercise's sets into bests, volume and a daily series. */
export function summarizeExercise(points: SetPoint[], tracking: TrainingTrackingType): ExerciseSummary {
  const { metric, label } = metricFor(tracking);
  let topWeight: number | null = null;
  let topWeightReps: number | null = null;
  let bestE1rm: number | null = null;
  let bestReps: number | null = null;
  let bestTimeSec: number | null = null;
  let bestDistance: number | null = null;
  let totalVolume = 0;
  const dates = new Set<string>();
  const bestByDay = new Map<string, number>();

  for (const s of points) {
    dates.add(s.date);
    if (s.weight != null) {
      if (topWeight == null || s.weight > topWeight) {
        topWeight = s.weight;
        topWeightReps = s.reps;
      }
      if (s.reps != null) {
        totalVolume += s.weight * s.reps;
        const est = e1rm(s.weight, s.reps);
        if (bestE1rm == null || est > bestE1rm) bestE1rm = est;
      }
    }
    if (s.reps != null && (bestReps == null || s.reps > bestReps)) bestReps = s.reps;
    if (s.timeSec != null && (bestTimeSec == null || s.timeSec > bestTimeSec)) bestTimeSec = s.timeSec;
    if (s.distance != null && (bestDistance == null || s.distance > bestDistance)) bestDistance = s.distance;

    const v = metricValue(metric, s);
    if (v != null) {
      const cur = bestByDay.get(s.date);
      if (cur == null || v > cur) bestByDay.set(s.date, v);
    }
  }

  const series = [...bestByDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value: Math.round(value * 10) / 10 }));

  return {
    topWeight,
    topWeightReps,
    bestE1rm,
    bestReps,
    bestTimeSec,
    bestDistance,
    totalVolume: Math.round(totalVolume),
    setCount: points.length,
    sessionCount: dates.size,
    metric,
    metricLabel: label,
    series,
  };
}

export interface TrainingOverview {
  totalSessions: number;
  sessionsThisWeek: number;
  sessionsPerWeek: number; // average over the window
  lastSessionDate: string | null;
  activeWeekStreak: number; // consecutive weeks (incl. this one) with ≥1 session
}

/**
 * Roster-free per-client overview from session dates. Weeks are Monday-anchored
 * in UTC (consistent with the rest of TFF's weekly math). Pure.
 */
export function trainingOverview(sessionDates: string[], today: string = new Date().toISOString().slice(0, 10)): TrainingOverview {
  if (sessionDates.length === 0) {
    return { totalSessions: 0, sessionsThisWeek: 0, sessionsPerWeek: 0, lastSessionDate: null, activeWeekStreak: 0 };
  }
  const sorted = [...sessionDates].sort();
  const last = sorted[sorted.length - 1];
  const first = sorted[0];
  const spanDays = Math.max(1, dayDiff(first, today) + 1);
  const weeks = Math.max(1, spanDays / 7);
  const thisWeekStart = mondayOf(today);
  const sessionsThisWeek = sessionDates.filter((d) => d >= thisWeekStart && d <= today).length;

  // Active week streak: walk back week by week while each has a session.
  const weeksWithSession = new Set(sessionDates.map((d) => mondayOf(d)));
  let streak = 0;
  let cursor = thisWeekStart;
  // If no session this week yet, start the streak check from last week (grace).
  if (!weeksWithSession.has(cursor)) cursor = addDays(cursor, -7);
  while (weeksWithSession.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -7);
  }

  return {
    totalSessions: sessionDates.length,
    sessionsThisWeek,
    sessionsPerWeek: Math.round((sessionDates.length / weeks) * 10) / 10,
    lastSessionDate: last,
    activeWeekStreak: streak,
  };
}

// --- date helpers (UTC, Monday-anchored) ---
const asUTC = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
function dayDiff(a: string, b: string): number {
  return Math.round((asUTC(b) - asUTC(a)) / 86_400_000);
}
function addDays(iso: string, n: number): string {
  return new Date(asUTC(iso) + n * 86_400_000).toISOString().slice(0, 10);
}
function mondayOf(iso: string): string {
  const d = new Date(asUTC(iso));
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
  return addDays(iso, -dow);
}
