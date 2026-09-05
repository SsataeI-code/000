import type { Goal } from "@/lib/nutrition/types";

const LB_PER_KG = 2.20462;
/** Below this weekly rate (lb) a fat-loss/gain goal counts as stalled. */
const STALL_LB_PER_WEEK = 0.25;
/** Need at least this many days of span to call a plateau (≈2 weeks). */
const MIN_SPAN_DAYS = 14;

export interface PlateauResult {
  plateaued: boolean;
  weeks: number;
  ratePerWeekLb: number | null;
}

const NONE: PlateauResult = { plateaued: false, weeks: 0, ratePerWeekLb: null };

/**
 * Detect a weight plateau — a fat-loss or muscle-gain client whose smoothed
 * weight has barely moved over the last few weeks, so their targets likely need
 * a recalc before they stall out (§5B "recalculate every 4–6 weeks or after a
 * significant weight change"). Maintain/recomp/habits-only never plateau (flat
 * is the point). Pure; input is the moving-average trend (kg) by date.
 */
export function detectPlateau(trend: { date: string; avgKg: number }[], goal: Goal): PlateauResult {
  if (goal !== "lose" && goal !== "gain") return NONE;
  if (trend.length < 3) return NONE;

  const last = trend[trend.length - 1];
  // Earliest point still within a ~3-week window of the latest reading.
  const cutoff = Date.parse(`${last.date}T00:00:00Z`) - 21 * 86_400_000;
  const window = trend.filter((p) => Date.parse(`${p.date}T00:00:00Z`) >= cutoff);
  if (window.length < 3) return NONE;

  const first = window[0];
  const spanDays = (Date.parse(`${last.date}T00:00:00Z`) - Date.parse(`${first.date}T00:00:00Z`)) / 86_400_000;
  if (spanDays < MIN_SPAN_DAYS) return NONE;

  const ratePerWeekLb = ((last.avgKg - first.avgKg) * LB_PER_KG) / spanDays * 7;
  const weeks = Math.round((spanDays / 7) * 10) / 10;
  return { plateaued: Math.abs(ratePerWeekLb) < STALL_LB_PER_WEEK, weeks, ratePerWeekLb: Math.round(ratePerWeekLb * 100) / 100 };
}
