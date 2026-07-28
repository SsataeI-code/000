import { createClient } from "@/lib/supabase/server";
import { sendPush } from "@/lib/push/send";
import type { Notification, NotificationKind } from "@/lib/types/db";

/** A user's recent notifications, newest first. */
export async function getNotifications(userId: string, limit = 30): Promise<Notification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Notification[] | null) ?? [];
}

/** Unread notification count for the bell badge. */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

/**
 * Create a notification for a recipient. Called from server actions; RLS lets a
 * user notify themselves, a coach notify their client, or the owner notify
 * anyone. Best-effort — a failed notification never blocks the primary action.
 */
export async function notify(input: {
  recipientId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  const supabase = await createClient();
  await supabase.from("notifications").insert({
    recipient_id: input.recipientId,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
  });
  // Also buzz their phone/desktop if they've opted into push (best-effort).
  await sendPush(input.recipientId, { title: input.title, body: input.body, link: input.link });
}
