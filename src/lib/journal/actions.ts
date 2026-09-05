"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { getClientDay } from "@/lib/time/server";

export interface JournalState {
  error?: string;
  ok?: boolean;
}

/**
 * Add a journal / food-diary entry — a note, a mood, and/or a photo (already
 * uploaded client-side to the caller's own folder). The path must start with the
 * caller's uid (defense beside RLS). An entry needs at least a note or a photo.
 */
export async function addJournalEntryAction(input: {
  body?: string;
  mood?: number | null;
  storagePath?: string | null;
}): Promise<JournalState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };

  const body = (input.body ?? "").trim();
  const storagePath = input.storagePath?.trim() || null;
  if (!body && !storagePath) return { error: "Write something or add a photo." };
  if (body.length > 4000) return { error: "That note is a bit long — trim it down." };
  if (storagePath && !storagePath.startsWith(`${user.id}/`)) return { error: "Couldn't save that photo." };

  const mood = input.mood != null && input.mood >= 1 && input.mood <= 5 ? Math.round(input.mood) : null;

  const supabase = await createClient();
  const { error } = await supabase.from("journal_entries").insert({
    client_id: user.id,
    body: body || null,
    mood,
    storage_path: storagePath,
    entry_date: await getClientDay(user.id),
  });
  if (error) return { error: "Couldn't save your entry — try again." };
  revalidatePath("/client/journal");
  return { ok: true };
}

/** Delete one of the caller's own entries (and its photo, best-effort). */
export async function deleteJournalEntryAction(id: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("journal_entries")
    .select("storage_path")
    .eq("id", id)
    .eq("client_id", user.id)
    .maybeSingle();
  await supabase.from("journal_entries").delete().eq("id", id).eq("client_id", user.id);
  if (row?.storage_path) {
    try {
      await supabase.storage.from("journal-photos").remove([row.storage_path]);
    } catch {
      /* orphaned object is harmless */
    }
  }
  revalidatePath("/client/journal");
}
