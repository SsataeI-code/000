import { createClient } from "@/lib/supabase/server";
import { dayInTimeZone } from "@/lib/time/day";

/**
 * A client's local calendar day ("YYYY-MM-DD"), resolved from their stored IANA
 * timezone (§2 — daily stats reset at the client's midnight, not UTC). Used by
 * every write that stamps a log date and every "today" read, so writes and reads
 * agree on which day it is. Falls back to UTC when no timezone is captured yet.
 */
export async function getClientDay(clientId: string): Promise<string> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("client_profiles")
      .select("timezone")
      .eq("id", clientId)
      .maybeSingle();
    return dayInTimeZone((data as { timezone: string | null } | null)?.timezone ?? null);
  } catch {
    return dayInTimeZone(null);
  }
}
