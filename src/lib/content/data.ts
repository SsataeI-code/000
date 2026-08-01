import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { defaultCopy, getCopy, type CopyKey, type CopyOverrides } from "@/lib/content/copy";
import { imageRowKey, isImageKey, getImage, CONTENT_IMAGES, type ImageKey, type ImageOverrides } from "@/lib/content/images";

/**
 * Load the owner's CMS copy overrides once per request (React `cache` dedupes
 * across the many server components that resolve copy). Defensive: any failure
 * or missing table yields an empty map, so the house-style defaults show and the
 * UI is never blank (§2 reliability). Only known keys are kept.
 */
export const getContentOverrides = cache(async (): Promise<CopyOverrides> => {
  const out: CopyOverrides = {};
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("content_overrides").select("key, value");
    for (const row of (data as { key: string; value: string }[] | null) ?? []) {
      if (row.key in defaultCopy) out[row.key as CopyKey] = row.value;
    }
  } catch {
    // Table not migrated yet, or a transient read error — fall back to defaults.
  }
  return out;
});

/**
 * A bound copy resolver for server components: `const t = await getCopyServer();
 * t("client.today.title")`. Applies the owner's overrides, else the default.
 */
export async function getCopyServer(): Promise<(key: CopyKey) => string> {
  const overrides = await getContentOverrides();
  return (key: CopyKey) => getCopy(key, overrides);
}

/**
 * Load the owner's image overrides once per request (§4 editable images). Reads
 * the "image:<key>" rows from content_overrides, keeping only known image keys.
 * Defensive: any failure yields an empty map, so components render their
 * built-in house-style defaults.
 */
export const getImageOverrides = cache(async (): Promise<ImageOverrides> => {
  const out: ImageOverrides = {};
  try {
    const supabase = await createClient();
    const rowKeys = CONTENT_IMAGES.map((i) => imageRowKey(i.key));
    const { data } = await supabase.from("content_overrides").select("key, value").in("key", rowKeys);
    for (const row of (data as { key: string; value: string }[] | null) ?? []) {
      const bare = row.key.replace(/^image:/, "");
      if (isImageKey(bare)) out[bare] = row.value;
    }
  } catch {
    // Not migrated yet or a transient read error — defaults render.
  }
  return out;
});

/** A bound image resolver for server components: `(key) => url | null`. */
export async function getImageServer(): Promise<(key: ImageKey) => string | null> {
  const overrides = await getImageOverrides();
  return (key: ImageKey) => getImage(key, overrides);
}
