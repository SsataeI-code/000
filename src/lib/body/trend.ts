import type { BodyMeasurement } from "@/lib/types/db";

/** Body weight trend math (§5C) — a moving average smooths daily noise. */

export interface TrendPoint {
  date: string;
  weightKg: number;
  avgKg: number; // trailing moving average
}

/** Trailing moving-average trend over weight entries (ascending by date). */
export function weightTrend(measurements: BodyMeasurement[], window = 7): TrendPoint[] {
  const points = measurements
    .filter((m) => m.weight_kg != null)
    .map((m) => ({ date: m.log_date, weightKg: Number(m.weight_kg) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const out: TrendPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const from = Math.max(0, i - window + 1);
    const slice = points.slice(from, i + 1);
    const avg = slice.reduce((s, p) => s + p.weightKg, 0) / slice.length;
    out.push({ date: points[i].date, weightKg: points[i].weightKg, avgKg: Math.round(avg * 10) / 10 });
  }
  return out;
}

/** Change in the smoothed trend from first to last point (kg). */
export function trendChangeKg(trend: TrendPoint[]): number {
  if (trend.length < 2) return 0;
  return Math.round((trend[trend.length - 1].avgKg - trend[0].avgKg) * 10) / 10;
}

const LB_PER_KG = 2.20462;
export function kgToLb(kg: number): number {
  return Math.round(kg * LB_PER_KG * 10) / 10;
}
export function lbToKg(lb: number): number {
  return Math.round((lb / LB_PER_KG) * 100) / 100;
}
