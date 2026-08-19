import { createClient } from "@/lib/supabase/server";
import type { LiftEntry } from "@/lib/lifts/progress";

/** A client's logged lifts over the last `days`, newest first. */
export async function getLifts(clientId: string, days = 180): Promise<LiftEntry[]> {
  const supabase = await createClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const { data } = await supabase
    .from("lift_logs")
    .select("id,exercise,weight,unit,reps,sets,log_date,note")
    .eq("client_id", clientId)
    .gte("log_date", since.toISOString().slice(0, 10))
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false });
  // Postgres numeric can arrive as a string — coerce so the pure math is clean.
  return ((data as Record<string, unknown>[] | null) ?? []).map((r) => ({
    id: String(r.id),
    exercise: String(r.exercise),
    weight: Number(r.weight) || 0,
    unit: r.unit === "kg" ? "kg" : "lb",
    reps: Number(r.reps) || 0,
    sets: Number(r.sets) || 1,
    log_date: String(r.log_date),
    note: (r.note as string | null) ?? null,
  }));
}
