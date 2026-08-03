import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isoDate, addDays } from "@/lib/habits/streaks";
import { providerDef, type ProviderDef } from "@/lib/wearables/providers";
import { parseOuraActivity, parseOuraSleep, parseFitbitSteps, parseFitbitSleep, mergeMetrics, type DailyMetric } from "@/lib/wearables/parse";
import type { WearableConnection } from "@/lib/types/db";

/**
 * Wearable data-pull (§7). Defensive throughout — any network/parse failure is
 * swallowed per connection so one bad tracker never breaks the sweep, and a bad
 * response never corrupts stored metrics (§6/§15). Live fetch is owner-gated: it
 * only runs for connections that exist (i.e. after the owner configures keys and
 * a client connects), so this is a safe no-op until then. Steps/sleep come from
 * Oura & Fitbit today; Whoop/Garmin connect but their pull isn't wired yet.
 */

async function fetchJson(url: string, token: string): Promise<unknown> {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Refresh the access token if it's expiring; persists the new tokens. Returns a usable token or null. */
async function ensureToken(admin: SupabaseClient, def: ProviderDef, conn: WearableConnection): Promise<string | null> {
  const expiringSoon = conn.expires_at ? new Date(conn.expires_at).getTime() - Date.now() < 60_000 : false;
  if (!expiringSoon) return conn.access_token;
  if (!conn.refresh_token || !def.tokenUrl) return conn.access_token;

  const clientId = process.env[`${def.envPrefix}_CLIENT_ID`] ?? "";
  const clientSecret = process.env[`${def.envPrefix}_CLIENT_SECRET`] ?? "";
  try {
    const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refresh_token, client_id: clientId, client_secret: clientSecret });
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(def.tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` }, body });
    if (!res.ok) return null;
    const tok = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!tok.access_token) return null;
    await admin
      .from("wearable_connections")
      .update({
        access_token: tok.access_token,
        refresh_token: tok.refresh_token ?? conn.refresh_token,
        expires_at: tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000).toISOString() : null,
      })
      .eq("id", conn.id);
    return tok.access_token;
  } catch {
    return null;
  }
}

async function fetchMetrics(def: ProviderDef, token: string, sinceDay: string): Promise<DailyMetric[]> {
  if (def.id === "oura") {
    const [act, sleep] = await Promise.all([
      fetchJson(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${sinceDay}`, token),
      fetchJson(`https://api.ouraring.com/v2/usercollection/sleep?start_date=${sinceDay}`, token),
    ]);
    return mergeMetrics(parseOuraActivity(act), parseOuraSleep(sleep));
  }
  if (def.id === "fitbit") {
    const [steps, sleep] = await Promise.all([
      fetchJson(`https://api.fitbit.com/1/user/-/activities/steps/date/${sinceDay}/today.json`, token),
      fetchJson(`https://api.fitbit.com/1.2/user/-/sleep/date/${sinceDay}/today.json`, token),
    ]);
    return mergeMetrics(parseFitbitSteps(steps), parseFitbitSleep(sleep));
  }
  return []; // whoop / garmin data-pull not wired yet
}

/** Sync one connection: refresh token, fetch the last ~2 weeks, upsert daily rows. Returns days written. */
export async function syncConnection(admin: SupabaseClient, conn: WearableConnection): Promise<number> {
  const def = providerDef(conn.provider);
  if (!def) return 0;
  const token = await ensureToken(admin, def, conn);
  if (!token) return 0;

  const sinceDay = isoDate(addDays(new Date(), -14));
  const metrics = await fetchMetrics(def, token, sinceDay);
  if (metrics.length === 0) {
    await admin.from("wearable_connections").update({ last_synced_at: new Date().toISOString() }).eq("id", conn.id);
    return 0;
  }

  const rows = metrics.map((m) => ({
    client_id: conn.client_id,
    provider: conn.provider,
    day: m.day,
    steps: m.steps ?? null,
    sleep_minutes: m.sleepMinutes ?? null,
    resting_hr: m.restingHr ?? null,
  }));
  await admin.from("wearable_daily").upsert(rows, { onConflict: "client_id,provider,day" });
  await admin.from("wearable_connections").update({ last_synced_at: new Date().toISOString() }).eq("id", conn.id);
  return rows.length;
}

/** Sync every connected wearable (called from the daily cron). Safe no-op with none. */
export async function syncAllWearables(): Promise<{ connections: number; daysWritten: number }> {
  const admin = createAdminClient();
  const { data } = await admin.from("wearable_connections").select("*").eq("status", "connected");
  const conns = (data ?? []) as WearableConnection[];
  let daysWritten = 0;
  for (const conn of conns) {
    try {
      daysWritten += await syncConnection(admin, conn);
    } catch {
      // one connection's failure never aborts the rest
    }
  }
  return { connections: conns.length, daysWritten };
}
