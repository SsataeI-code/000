import { cookies } from "next/headers";
import { parseRange, RANGE_COOKIE, type RangeDays } from "@/lib/charts/series";

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
