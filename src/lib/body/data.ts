import { createClient } from "@/lib/supabase/server";
import type { BodyMeasurement, BodyPhoto } from "@/lib/types/db";
import { getClientDay } from "@/lib/time/server";

export interface BodyPhotoView extends BodyPhoto {
  url: string | null;
}

/**
 * A client's progress photos (§C), newest first, each with a short-lived signed
 * URL for the private bucket. RLS scopes rows to the client / their coach / the
 * owner; a missing or expired object just renders without a URL — never fatal.
 */
export async function getBodyPhotos(clientId: string, limit = 60): Promise<BodyPhotoView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("body_photos")
    .select("*")
    .eq("client_id", clientId)
    .order("taken_on", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  const out: BodyPhotoView[] = [];
  for (const row of rows) {
    let url: string | null = null;
    try {
      const signed = await supabase.storage.from("body-photos").createSignedUrl(row.storage_path, 3600);
      url = signed.data?.signedUrl ?? null;
    } catch {
      url = null;
    }
    out.push({ ...row, url });
  }
  return out;
}

/** Total water (ml) logged today (the client's local day). */
export async function getTodayWaterMl(clientId: string, day?: string): Promise<number> {
  const supabase = await createClient();
  const d = day ?? (await getClientDay(clientId));
  const { data } = await supabase
    .from("water_logs")
    .select("ml")
    .eq("client_id", clientId)
    .eq("log_date", d);
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
