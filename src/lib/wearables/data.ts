import { createClient } from "@/lib/supabase/server";
import type { WearableProviderId } from "@/lib/types/db";

export interface WearableStatus {
  provider: WearableProviderId;
  status: string;
  lastSyncedAt: string | null;
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
