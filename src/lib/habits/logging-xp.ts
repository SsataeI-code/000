import { createClient } from "@/lib/supabase/server";

export interface LoggingXpCounts {
  foodLogs: number;
  hydrationDays: number;
  todayFoodLogs: number;
  hydratedToday: boolean;
}

const ZERO: LoggingXpCounts = { foodLogs: 0, hydrationDays: 0, todayFoodLogs: 0, hydratedToday: false };

/**
 * Logging-XP inputs for the game: lifetime food logs + distinct hydration days
 * (days with net-positive water — not per sip, so it can't be gamed), plus
 * today's counts for the "+XP today" chip. Defensive: any read hiccup returns
 * zeros so the level never breaks the page.
 */
export async function getLoggingXpCounts(clientId: string, today: string): Promise<LoggingXpCounts> {
  try {
    const supabase = await createClient();
    const [foodAll, foodToday, water] = await Promise.all([
      supabase.from("food_logs").select("id", { count: "exact", head: true }).eq("client_id", clientId),
      supabase.from("food_logs").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("log_date", today),
      supabase.from("water_logs").select("log_date, ml").eq("client_id", clientId),
    ]);

    const rows = (water.data ?? []) as { log_date: string; ml: number }[];
    const byDay = new Map<string, number>();
    for (const r of rows) byDay.set(r.log_date, (byDay.get(r.log_date) ?? 0) + (Number(r.ml) || 0));
    let hydrationDays = 0;
    let hydratedToday = false;
    for (const [day, ml] of byDay) {
      if (ml > 0) {
        hydrationDays++;
        if (day === today) hydratedToday = true;
      }
    }

    return { foodLogs: foodAll.count ?? 0, hydrationDays, todayFoodLogs: foodToday.count ?? 0, hydratedToday };
  } catch {
    return ZERO;
  }
}
