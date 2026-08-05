/**
 * CMS editable images (§4 — "every image in the app is editable by the coach").
 * A small registry of overridable branding images. Each ships with a built-in
 * house-style default (rendered by the component itself), so an unset image just
 * shows the default — nothing is ever blank. Overrides are stored in the same
 * content_overrides key/value table as copy, under an "image:<key>" row.
 */

export type ImageKey = "brand.logo" | "coach.photo";

export interface ImageDef {
  key: ImageKey;
  label: string;
  description: string;
}

export const CONTENT_IMAGES: ImageDef[] = [
  {
    key: "brand.logo",
    label: "Logo",
    description: "Shown in the top bar and on the sign-in screen. A square image works best.",
  },
  {
    key: "coach.photo",
    label: "Coach photo",
    description: "Your photo on the landing page's “Meet your coach” section. A square headshot works best.",
  },
];

const KEYS = new Set(CONTENT_IMAGES.map((i) => i.key));
export const isImageKey = (v: string): v is ImageKey => KEYS.has(v as ImageKey);

/** The content_overrides row key for an image (namespaced so it never collides with copy). */
export const imageRowKey = (key: ImageKey): string => `image:${key}`;

export type ImageOverrides = Partial<Record<ImageKey, string>>;

/** Resolve an image's override URL, or null to fall back to the built-in default. */
export function getImage(key: ImageKey, overrides: ImageOverrides = {}): string | null {
  const v = overrides[key];
  return v != null && v !== "" ? v : null;
}
