/**
 * Wearable response parsers (§7 "pull steps/sleep"). Pure and tested: each takes
 * a provider's raw JSON and returns normalized daily metrics, defensively — a
 * missing/odd field is skipped, a bad shape yields [], nothing ever throws (so a
 * bad response can never corrupt stored data, §6/§15). Steps come from Oura &
 * Fitbit (the providers that report them); sleep from both.
 */

export interface DailyMetric {
  day: string; // YYYY-MM-DD
  steps?: number;
  sleepMinutes?: number;
  restingHr?: number;
}

const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const posInt = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
};
const rows = (json: unknown, key: string): unknown[] => {
  const arr = (json as Record<string, unknown> | null)?.[key];
  return Array.isArray(arr) ? arr : [];
};

/** Oura v2 daily_activity: { data: [{ day, steps }] }. */
export function parseOuraActivity(json: unknown): DailyMetric[] {
  const out: DailyMetric[] = [];
  for (const r of rows(json, "data")) {
    const day = (r as Record<string, unknown>)?.day;
    const steps = posInt((r as Record<string, unknown>)?.steps);
    if (isDay(day) && steps !== undefined) out.push({ day, steps });
  }
  return out;
}

/** Oura v2 sleep: { data: [{ day, total_sleep_duration (seconds) }] }. */
export function parseOuraSleep(json: unknown): DailyMetric[] {
  const out: DailyMetric[] = [];
  for (const r of rows(json, "data")) {
    const rec = r as Record<string, unknown>;
    const day = rec?.day;
    const secs = posInt(rec?.total_sleep_duration);
    if (isDay(day) && secs !== undefined) out.push({ day, sleepMinutes: Math.round(secs / 60) });
  }
  return out;
}

/** Fitbit activities/steps time series: { "activities-steps": [{ dateTime, value }] }. */
export function parseFitbitSteps(json: unknown): DailyMetric[] {
  const out: DailyMetric[] = [];
  for (const r of rows(json, "activities-steps")) {
    const rec = r as Record<string, unknown>;
    const day = rec?.dateTime;
    const steps = posInt(rec?.value);
    if (isDay(day) && steps !== undefined) out.push({ day, steps });
  }
  return out;
}

/** Fitbit sleep log: { sleep: [{ dateOfSleep, minutesAsleep }] }. */
export function parseFitbitSleep(json: unknown): DailyMetric[] {
  const out: DailyMetric[] = [];
  for (const r of rows(json, "sleep")) {
    const rec = r as Record<string, unknown>;
    const day = rec?.dateOfSleep;
    const mins = posInt(rec?.minutesAsleep);
    if (isDay(day) && mins !== undefined) out.push({ day, sleepMinutes: mins });
  }
  return out;
}

/** Merge several metric lists into one row per day (later values win per field). */
export function mergeMetrics(...lists: DailyMetric[][]): DailyMetric[] {
  const byDay = new Map<string, DailyMetric>();
  for (const list of lists) {
    for (const m of list) {
      const cur = byDay.get(m.day) ?? { day: m.day };
      if (m.steps !== undefined) cur.steps = m.steps;
      if (m.sleepMinutes !== undefined) cur.sleepMinutes = m.sleepMinutes;
      if (m.restingHr !== undefined) cur.restingHr = m.restingHr;
      byDay.set(m.day, cur);
    }
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}
