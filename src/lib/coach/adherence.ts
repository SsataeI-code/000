/**
 * Adherence score (0–100) — one number for "are they doing the work", from the
 * three signals that predict results: habit consistency, how often they log
 * food, and whether they hit their protein target. Components that have no data
 * (e.g. no habits, or no protein target) are dropped and the rest re-weighted,
 * so the score is always out of the signals that actually apply. Pure/tested.
 */

export interface AdherenceInput {
  /** Avg habit consistency over the window, 0..1 (undefined = no habits). */
  habitConsistency?: number;
  /** Share of window days with a food log, 0..1 (undefined = not tracking food). */
  loggedRate?: number;
  /** Protein hit rate vs target, 0..1 (undefined = no protein target/data). */
  proteinOnTarget?: number;
}

const WEIGHTS = { habitConsistency: 0.4, loggedRate: 0.35, proteinOnTarget: 0.25 } as const;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** 0–100 adherence, or null when there's no signal at all yet. */
export function computeAdherence(input: AdherenceInput): number | null {
  let weighted = 0;
  let totalWeight = 0;
  for (const key of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
    const v = input[key];
    if (v == null || !Number.isFinite(v)) continue;
    weighted += clamp01(v) * WEIGHTS[key];
    totalWeight += WEIGHTS[key];
  }
  if (totalWeight === 0) return null;
  return Math.round((weighted / totalWeight) * 100);
}

export interface AdherenceBand {
  label: string;
  /** "success" | "warn" | "risk" — for colour. */
  tone: "success" | "warn" | "risk";
}

/** A label + tone for a score (or "No data" when null). */
export function adherenceBand(score: number | null): AdherenceBand {
  if (score == null) return { label: "No data", tone: "warn" };
  if (score >= 80) return { label: "On it", tone: "success" };
  if (score >= 55) return { label: "Steady", tone: "warn" };
  return { label: "Needs a push", tone: "risk" };
}
