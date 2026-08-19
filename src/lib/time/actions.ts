"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

/**
 * Capture the client's browser timezone so the server can reset their daily
 * stats at their local midnight (§2). Only writes when the value is a plausible
 * IANA name and actually changed — cheap to call on every load. Best-effort:
 * never throws, never blocks the UI.
 */
export async function captureTimezoneAction(tz: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const zone = typeof tz === "string" ? tz.trim() : "";
  // A light IANA sanity check ("Area/Location"); reject anything odd.
  if (!zone || zone.length > 64 || !/^[A-Za-z]+\/[A-Za-z0-9_+\-/]+$/.test(zone)) return;

  try {
    const supabase = await createClient();
    const { data } = await supabase.from("client_profiles").select("timezone").eq("id", user.id).maybeSingle();
    if (!data) return; // no profile yet (pre-onboarding) — nothing to update
    if ((data as { timezone: string | null }).timezone === zone) return; // unchanged
    await supabase.from("client_profiles").update({ timezone: zone }).eq("id", user.id);
  } catch {
    // Best-effort — a failed capture just means we fall back to UTC for now.
  }
}
