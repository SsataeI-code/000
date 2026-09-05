import { createClient } from "@/lib/supabase/server";
import type { CheckIn } from "@/lib/types/db";

/** Monday (UTC-safe) of the week containing an ISO date — the check-in's key. */
export function weekStartOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const diff = (d.getUTCDay() + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/** Recent check-ins for a client, newest week first. */
export async function getCheckins(clientId: string, limit = 12): Promise<CheckIn[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("check_ins")
    .select("*")
    .eq("client_id", clientId)
    .order("week_start", { ascending: false })
    .limit(limit);
  return (data as CheckIn[] | null) ?? [];
}

/** This week's check-in for a client (by their local week), or null. */
export async function getThisWeekCheckin(clientId: string, todayLocal: string): Promise<CheckIn | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("check_ins")
    .select("*")
    .eq("client_id", clientId)
    .eq("week_start", weekStartOf(todayLocal))
    .maybeSingle();
  return (data as CheckIn | null) ?? null;
}
