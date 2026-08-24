import { cookies } from "next/headers";
import { parseRange, RANGE_COOKIE, parseView, VIEW_COOKIE, type RangeDays, type ChartView } from "@/lib/charts/series";

/** Resolve the chart granularity (weekly default): `?view=` wins, else cookie. */
export async function resolveView(spView: string | undefined): Promise<ChartView> {
  if (spView != null) return parseView(spView);
  const store = await cookies();
  return parseView(store.get(VIEW_COOKIE)?.value);
}

/**
 * Resolve the graph time-range for a request: an explicit `?range=` wins (so a
 * shared link is honored), otherwise fall back to the remembered cookie, then
 * the 30-day default. Server-only (reads request cookies).
 */
export async function resolveRange(spRange: string | undefined): Promise<RangeDays> {
  if (spRange != null) return parseRange(spRange);
  const store = await cookies();
  return parseRange(store.get(RANGE_COOKIE)?.value);
}
