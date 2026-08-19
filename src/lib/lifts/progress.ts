/**
 * Lift progress math (owner decision, 2026 — track strength progress). Pure and
 * tested. Estimated 1RM uses the Epley formula, the most common gym standard;
 * we never invent data, only summarize what the client logged.
 */

export interface LiftEntry {
  id: string;
  exercise: string;
  weight: number; // in `unit`
  unit: "lb" | "kg";
  reps: number;
  sets: number;
  log_date: string; // YYYY-MM-DD
  note?: string | null;
}

const LB_PER_KG = 2.20462;
export const toLb = (weight: number, unit: "lb" | "kg"): number =>
  unit === "kg" ? Math.round(weight * LB_PER_KG * 10) / 10 : weight;

/** Estimated one-rep max (Epley). 1 rep → the weight itself. Rounded. */
export function e1rm(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || weight <= 0) return 0;
  const r = Number.isFinite(reps) && reps > 0 ? reps : 1;
  if (r === 1) return Math.round(weight);
  return Math.round(weight * (1 + r / 30));
}

/** Distinct exercise names in the log, most recently trained first. */
export function exerciseNames(entries: LiftEntry[]): string[] {
  const lastSeen = new Map<string, string>();
  for (const e of entries) {
    const prev = lastSeen.get(e.exercise);
    if (!prev || e.log_date > prev) lastSeen.set(e.exercise, e.log_date);
  }
  return [...lastSeen.entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([name]) => name);
}

/** All entries for one exercise, oldest first (for a progress trend). */
export function historyFor(entries: LiftEntry[], exercise: string): LiftEntry[] {
  return entries
    .filter((e) => e.exercise === exercise)
    .sort((a, b) => a.log_date.localeCompare(b.log_date));
}

export interface LiftBest {
  exercise: string;
  /** Heaviest weight lifted (in lb, normalized) and its reps. */
  topWeightLb: number;
  topWeightReps: number;
  /** Best estimated 1RM (in lb) across all logged sets. */
  bestE1rmLb: number;
  lastDate: string;
  entryCount: number;
}

/** Per-exercise personal bests (weights normalized to lb for comparison). */
export function personalBests(entries: LiftEntry[]): LiftBest[] {
  const byExercise = new Map<string, LiftEntry[]>();
  for (const e of entries) {
    const arr = byExercise.get(e.exercise) ?? [];
    arr.push(e);
    byExercise.set(e.exercise, arr);
  }

  const out: LiftBest[] = [];
  for (const [exercise, list] of byExercise) {
    let topWeightLb = 0;
    let topWeightReps = 0;
    let bestE1rmLb = 0;
    let lastDate = "";
    for (const e of list) {
      const wLb = toLb(e.weight, e.unit);
      if (wLb > topWeightLb) {
        topWeightLb = wLb;
        topWeightReps = e.reps;
      }
      const est = e1rm(wLb, e.reps);
      if (est > bestE1rmLb) bestE1rmLb = est;
      if (e.log_date > lastDate) lastDate = e.log_date;
    }
    out.push({ exercise, topWeightLb, topWeightReps, bestE1rmLb, lastDate, entryCount: list.length });
  }
  // Most recently trained first.
  return out.sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

/**
 * Is this entry a new estimated-1RM best for its exercise, given everything
 * logged strictly before it? Used to stamp a PR when the client logs a set.
 */
export function isE1rmPr(entry: LiftEntry, priorEntries: LiftEntry[]): boolean {
  const mine = e1rm(toLb(entry.weight, entry.unit), entry.reps);
  if (mine <= 0) return false;
  const priorBest = priorEntries
    .filter((e) => e.exercise === entry.exercise && e.id !== entry.id)
    .reduce((m, e) => Math.max(m, e1rm(toLb(e.weight, e.unit), e.reps)), 0);
  return mine > priorBest;
}
