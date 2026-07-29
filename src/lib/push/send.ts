import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { isQuietNow } from "@/lib/notifications/quiet";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * True when it's currently quiet hours for the recipient (§10) — we suppress the
 * push buzz then (the in-app notification is still recorded). Defensive: any
 * lookup failure means "not quiet" so a real alert is never wrongly swallowed.
 */
async function isRecipientQuiet(admin: SupabaseClient, recipientId: string): Promise<boolean> {
  try {
    const { data } = await admin
      .from("client_profiles")
      .select("quiet_start, quiet_end, timezone")
      .eq("id", recipientId)
      .maybeSingle();
    if (!data) return false;
    return isQuietNow({ start: data.quiet_start, end: data.quiet_end, timezone: data.timezone });
  } catch {
    return false;
  }
}

/**
 * Web Push delivery (§10 "PWA push"). SERVER ONLY. Reads a recipient's device
 * subscriptions under the service role and sends a push to each, pruning any
 * that have expired. Gated on the VAPID keys — without them it's a no-op so the
 * in-app notification (the default channel) still lands.
 */

export interface PushPayload {
  title: string;
  body?: string;
  link?: string;
}

function vapid(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  const subject = process.env.VAPID_SUBJECT || "mailto:coach@totalformfitness.com";
  return { publicKey, privateKey, subject };
}

export async function sendPush(recipientId: string, payload: PushPayload): Promise<void> {
  const keys = vapid();
  if (!keys) return;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return; // no service-role key yet
  }

  // Honor quiet hours: skip the buzz, but the in-app notification still stands.
  if (await isRecipientQuiet(admin, recipientId)) return;

  try {
    webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
    const { data } = await admin.from("push_subscriptions").select("*").eq("user_id", recipientId);
    const body = JSON.stringify(payload);
    await Promise.all(
      (data ?? []).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
        } catch (err) {
          const code = (err as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) {
            await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          }
        }
      }),
    );
  } catch {
    // Push is best-effort — never let it break the primary action.
  }
}
