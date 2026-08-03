import { createClient } from "@/lib/supabase/server";
import type { WearableProviderId } from "@/lib/types/db";

export interface WearableStatus {
  provider: WearableProviderId;
  status: string;
  lastSyncedAt: string | null;
}

export interface LatestMetric {
  day: string;
  steps: number | null;
  sleepMinutes: number | null;
}

/** The most recent synced day of metrics for a client (across providers), for the UI. */
export async function getLatestWearableMetric(clientId: string): Promise<LatestMetric | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wearable_daily")
    .select("day,steps,sleep_minutes")
    .eq("client_id", clientId)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { day: data.day, steps: data.steps ?? null, sleepMinutes: data.sleep_minutes ?? null };
}

/**
 * A client's wearable connections for the UI — status only, never the tokens.
 * RLS scopes rows to the signed-in client (tokens stay server/service-role side).
 */
export async function getWearableStatuses(clientId: string): Promise<WearableStatus[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wearable_connections")
    .select("provider,status,last_synced_at")
    .eq("client_id", clientId);
  return (data ?? []).map((r) => ({
    provider: r.provider,
    status: r.status,
    lastSyncedAt: r.last_synced_at ?? null,
  }));
}
