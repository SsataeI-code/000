"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export interface PushSubJson {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Save (or refresh) a device's push subscription for the current user. */
export async function savePushSubscriptionAction(raw: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };

  let sub: PushSubJson;
  try {
    sub = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Bad subscription." };
  }
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return { ok: false, error: "Incomplete subscription." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      { onConflict: "endpoint" },
    );
  if (error) return { ok: false, error: "Couldn't save." };
  return { ok: true };
}

/** Remove a device's subscription (user turned push off). */
export async function removePushSubscriptionAction(endpoint: string): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false };
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return { ok: true };
}
