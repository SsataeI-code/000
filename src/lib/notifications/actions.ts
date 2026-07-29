"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

/** Mark all of the current user's notifications read. */
export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);
  revalidatePath("/client/you");
  revalidatePath("/coach/you");
}

/** Mark a single notification read (e.g. on tap-through). */
export async function markNotificationReadAction(id: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", user.id);
}

export interface QuietHoursState {
  ok?: boolean;
  error?: string;
}

/**
 * Save the client's quiet hours (§10). `start`/`end` are minutes past local
 * midnight, or null to turn quiet hours off. `timezone` is the client's IANA
 * zone (captured in the browser) so the server can evaluate the window. RLS
 * scopes the update to the signed-in client.
 */
export async function saveQuietHoursAction(
  start: number | null,
  end: number | null,
  timezone: string | null,
): Promise<QuietHoursState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };

  const clamp = (n: number | null) =>
    n == null ? null : Math.max(0, Math.min(1439, Math.round(n)));

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_profiles")
    .update({
      quiet_start: clamp(start),
      quiet_end: clamp(end),
      timezone: timezone && timezone.length < 64 ? timezone : null,
    })
    .eq("id", user.id);
  if (error) return { error: "Couldn't save your quiet hours. Try again." };

  revalidatePath("/client/you");
  return { ok: true };
}
