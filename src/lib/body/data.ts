import { createClient } from "@/lib/supabase/server";
import type { BodyMeasurement } from "@/lib/types/db";
import { todayIso } from "@/lib/nutrition/summary";

/** Total water (ml) logged today. */
export async function getTodayWaterMl(clientId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("water_logs")
    .select("ml")
    .eq("client_id", clientId)
    .eq("log_date", todayIso());
  return (data ?? []).reduce((sum, r) => sum + (Number(r.ml) || 0), 0);
}

/** Body measurements, most recent last (ascending) for trend math. */
export async function getBodyMeasurements(clientId: string, limit = 180): Promise<BodyMeasurement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("client_id", clientId)
    .order("log_date", { ascending: false })
    .limit(limit);
  const rows = (data as BodyMeasurement[] | null) ?? [];
  return rows.reverse(); // ascending
}
