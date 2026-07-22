import type { Goal, Sex, ActivityLevel } from "@/lib/types/db";
import { kgToLb } from "@/lib/body/trend";

/**
 * Cohort slicing for the roster (§9 — "segment clients into groups by age,
 * gender, weight, body-fat %, goal, etc., and compare per-segment stats").
 * Pure and dependency-light so it's unit-tested without a database.
 */

export type CohortDimension = "goal" | "sex" | "activity" | "age" | "body_fat";

/** The per-client fields cohort math needs — a subset of RosterClient. */
export interface CohortClient {
  goal: Goal;
  sex: Sex | null;
  age: number | null;
  activity: ActivityLevel | null;
  bodyFatPct: number | null;
  lastWeightKg: number | null;
  daysSinceActivity: number;
  flags: unknown[];
}

export interface Segment {
  key: string;
  label: string;
  count: number;
  activeToday: number;
  flagged: number;
  avgWeightLb: number | null;
  avgBodyFatPct: number | null;
}

const GOAL_LABEL: Record<Goal, string> = {
  lose: "Fat loss", gain: "Muscle gain", maintain: "Maintain", recomp: "Recomp", habits_only: "Habits",
};
const SEX_LABEL: Record<Sex, string> = { male: "Male", female: "Female" };
const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: "Sedentary", light: "Light", moderate: "Moderate", very: "Very active", athlete: "Athlete",
};

const AGE_BANDS: [string, string, (a: number) => boolean][] = [
  ["u25", "Under 25", (a) => a < 25],
  ["25_34", "25–34", (a) => a >= 25 && a < 35],
  ["35_44", "35–44", (a) => a >= 35 && a < 45],
  ["45_54", "45–54", (a) => a >= 45 && a < 55],
  ["55p", "55+", (a) => a >= 55],
];

const BF_BANDS: [string, string, (v: number) => boolean][] = [
  ["u15", "Under 15%", (v) => v < 15],
  ["15_20", "15–20%", (v) => v >= 15 && v < 20],
  ["20_25", "20–25%", (v) => v >= 20 && v < 25],
  ["25_30", "25–30%", (v) => v >= 25 && v < 30],
  ["30p", "30%+", (v) => v >= 30],
];

/** Bucket key + label for one client on one dimension. `null` = unknown/skip. */
function bucketOf(c: CohortClient, dim: CohortDimension): { key: string; label: string } | null {
  switch (dim) {
    case "goal":
      return { key: c.goal, label: GOAL_LABEL[c.goal] ?? c.goal };
    case "sex":
      return c.sex ? { key: c.sex, label: SEX_LABEL[c.sex] } : null;
    case "activity":
      return c.activity ? { key: c.activity, label: ACTIVITY_LABEL[c.activity] } : null;
    case "age": {
      if (c.age == null) return null;
      const band = AGE_BANDS.find(([, , test]) => test(c.age as number));
      return band ? { key: band[0], label: band[1] } : null;
    }
    case "body_fat": {
      if (c.bodyFatPct == null) return null;
      const band = BF_BANDS.find(([, , test]) => test(c.bodyFatPct as number));
      return band ? { key: band[0], label: band[1] } : null;
    }
  }
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Group the roster by a dimension and compute per-segment stats. Segments are
 * ordered largest-first; clients with no value for the dimension are omitted
 * (they simply don't belong to any segment of it).
 */
export function segmentRoster(clients: CohortClient[], dim: CohortDimension): Segment[] {
  const groups = new Map<string, { label: string; members: CohortClient[] }>();
  for (const c of clients) {
    const b = bucketOf(c, dim);
    if (!b) continue;
    const g = groups.get(b.key) ?? { label: b.label, members: [] };
    g.members.push(c);
    groups.set(b.key, g);
  }

  const segments: Segment[] = [];
  for (const [key, { label, members }] of groups) {
    const weights = members.map((m) => m.lastWeightKg).filter((w): w is number => w != null);
    const bodyFats = members.map((m) => m.bodyFatPct).filter((v): v is number => v != null);
    const avgW = avg(weights);
    const avgBf = avg(bodyFats);
    segments.push({
      key,
      label,
      count: members.length,
      activeToday: members.filter((m) => m.daysSinceActivity === 0).length,
      flagged: members.filter((m) => m.flags.length > 0).length,
      avgWeightLb: avgW == null ? null : Math.round(kgToLb(avgW)),
      avgBodyFatPct: avgBf == null ? null : Math.round(avgBf * 10) / 10,
    });
  }

  segments.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return segments;
}

export const COHORT_DIMENSIONS: { key: CohortDimension; label: string }[] = [
  { key: "goal", label: "Goal" },
  { key: "sex", label: "Gender" },
  { key: "age", label: "Age" },
  { key: "activity", label: "Activity" },
  { key: "body_fat", label: "Body fat" },
];
