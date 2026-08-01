"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { defaultCopy, type CopyKey } from "@/lib/content/copy";
import { isImageKey, imageRowKey } from "@/lib/content/images";

export interface ContentActionState {
  ok?: boolean;
  error?: string;
}

/**
 * Save an editable image override (§4). The image was uploaded to the public
 * content-images bucket client-side; here the owner stores its public URL as an
 * "image:<key>" content_overrides row. Owner-only (enforced here + by RLS).
 */
export async function saveImageOverrideAction(key: string, url: string): Promise<ContentActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };
  if (user.role !== "owner") return { error: "Only the owner can edit images." };
  if (!isImageKey(key)) return { error: "Unknown image." };
  const value = String(url ?? "").trim();
  if (!/^https?:\/\//i.test(value)) return { error: "Couldn't read that image URL." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("content_overrides")
    .upsert({ key: imageRowKey(key), value, updated_by: user.id }, { onConflict: "key" });
  if (error) return { error: "Couldn't save the image. Try again." };

  revalidatePath("/", "layout"); // the logo shows app-wide
  return { ok: true };
}

/** Clear an image override so the built-in house-style default renders again. */
export async function resetImageOverrideAction(key: string): Promise<ContentActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };
  if (user.role !== "owner") return { error: "Only the owner can edit images." };
  if (!isImageKey(key)) return { error: "Unknown image." };

  const supabase = await createClient();
  const { error } = await supabase.from("content_overrides").delete().eq("key", imageRowKey(key));
  if (error) return { error: "Couldn't reset the image. Try again." };

  revalidatePath("/", "layout");
  return { ok: true };
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
