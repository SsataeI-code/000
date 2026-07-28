"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { defaultCopy, type CopyKey } from "@/lib/content/copy";

export interface ContentActionState {
  ok?: boolean;
  error?: string;
}

/**
 * Save the owner's copy edits (§4 full CMS). For each key: a value that differs
 * from the house-style default is stored as an override; a blank value or one
 * equal to the default clears any override (reset). Owner-only — enforced here
 * and again by RLS on `content_overrides`.
 */
export async function saveContentAction(
  edits: { key: string; value: string }[],
): Promise<ContentActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };
  if (user.role !== "owner") return { error: "Only the owner can edit app copy." };

  const toUpsert: { key: string; value: string; updated_by: string }[] = [];
  const toDelete: string[] = [];

  for (const { key, value } of edits) {
    if (!(key in defaultCopy)) continue; // ignore unknown keys
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === defaultCopy[key as CopyKey]) {
      toDelete.push(key);
    } else {
      toUpsert.push({ key, value: trimmed, updated_by: user.id });
    }
  }

  const supabase = await createClient();

  if (toUpsert.length > 0) {
    const { error } = await supabase.from("content_overrides").upsert(toUpsert, { onConflict: "key" });
    if (error) return { error: "Couldn't save your changes. Try again." };
  }
  if (toDelete.length > 0) {
    const { error } = await supabase.from("content_overrides").delete().in("key", toDelete);
    if (error) return { error: "Couldn't reset some fields. Try again." };
  }

  // Copy shows everywhere — refresh the whole app's rendered strings.
  revalidatePath("/", "layout");
  return { ok: true };
}
