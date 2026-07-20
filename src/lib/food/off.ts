/**
 * Open Food Facts client (CLAUDE.md §6).
 *
 * Trust-but-verify: OFF is crowdsourced, so a "not found" can arrive as HTTP 200
 * with `status: 0`, and any field can be missing or the wrong type. Every parse
 * here is defensive — a bad response yields a clear "not found / incomplete"
 * result, NEVER a throw and never a corrupted log. The UI shows what's known and
 * lets the client confirm or fill the gaps, then we save it back.
 */

export interface NormalizedFood {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  servingSizeG: number | null;
  /** Per-100g macros. null means "unknown — ask the client to confirm". */
  per100g: {
    calories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
  };
  /** Full raw per-100g nutriment map (numbers only) for micro slicing later. */
  nutrimentsPer100g: Record<string, number>;
  /** Which core macros are missing, so the UI can prompt for a one-tap fill. */
  missing: Array<"calories" | "proteinG" | "carbsG" | "fatG">;
}

export type OffLookupResult =
  | { found: true; product: NormalizedFood }
  | { found: false; reason: "not_found" | "bad_response" | "network_error" };

/** Coerce an unknown OFF value to a finite number, else null. Never throws. */
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Parse a raw OFF `/product/{barcode}.json` payload into our normalized shape.
 * Pure and total — safe to call on anything (undefined, {}, garbage).
 */
export function parseOffResponse(barcode: string, json: unknown): OffLookupResult {
  if (!json || typeof json !== "object") {
    return { found: false, reason: "bad_response" };
  }

  const root = json as Record<string, unknown>;

  // OFF "not found" is HTTP 200 with status 0 (the classic trap, §6).
  if (root.status === 0 || root.status === "0") {
    return { found: false, reason: "not_found" };
  }

  const product = root.product;
  if (!product || typeof product !== "object") {
    return { found: false, reason: "not_found" };
  }
  const p = product as Record<string, unknown>;

  const rawNutriments =
    p.nutriments && typeof p.nutriments === "object"
      ? (p.nutriments as Record<string, unknown>)
      : {};

  // Keep every numeric per-100g nutriment for future micro slicing.
  const nutrimentsPer100g: Record<string, number> = {};
  for (const [key, value] of Object.entries(rawNutriments)) {
    if (!key.endsWith("_100g")) continue;
    const n = toNumber(value);
    if (n !== null) nutrimentsPer100g[key.replace(/_100g$/, "")] = n;
  }

  // Energy: prefer kcal; fall back to converting kJ if only that exists.
  let calories = toNumber(rawNutriments["energy-kcal_100g"]);
  if (calories === null) {
    const kj = toNumber(rawNutriments["energy-kj_100g"]) ?? toNumber(rawNutriments["energy_100g"]);
    if (kj !== null) calories = Math.round(kj / 4.184);
  }

  const per100g = {
    calories,
    proteinG: toNumber(rawNutriments["proteins_100g"]),
    carbsG: toNumber(rawNutriments["carbohydrates_100g"]),
    fatG: toNumber(rawNutriments["fat_100g"]),
  };

  const missing = (["calories", "proteinG", "carbsG", "fatG"] as const).filter(
    (k) => per100g[k] === null,
  );

  const product_: NormalizedFood = {
    barcode,
    name: toStringOrNull(p.product_name) ?? toStringOrNull(p.generic_name),
    brand: toStringOrNull(p.brands),
    imageUrl: toStringOrNull(p.image_front_small_url) ?? toStringOrNull(p.image_url),
    servingSizeG: toNumber(p.serving_quantity),
    per100g,
    nutrimentsPer100g,
    missing,
  };

  return { found: true, product: product_ };
}

const OFF_BASE = "https://world.openfoodfacts.org/api/v2";
const OFF_FIELDS =
  "product_name,generic_name,brands,image_front_small_url,image_url,serving_quantity,nutriments";

/** Barcodes are digits (EAN/UPC). Reject anything else before hitting the network. */
export function isValidBarcode(raw: string): boolean {
  return /^\d{6,14}$/.test(raw.trim());
}

/**
 * Look up a product by barcode. Never throws: network/parse failures come back
 * as a typed `found: false` result the UI can handle gracefully.
 */
export async function fetchProductByBarcode(
  barcode: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OffLookupResult> {
  const code = barcode.trim();
  if (!isValidBarcode(code)) return { found: false, reason: "bad_response" };

  try {
    const res = await fetchImpl(
      `${OFF_BASE}/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`,
      { headers: { "User-Agent": "TotalFormFitness/0.1 (coach app)" } },
    );
    // OFF returns 404 for some unknown codes and 200+status:0 for others.
    if (res.status === 404) return { found: false, reason: "not_found" };
    if (!res.ok) return { found: false, reason: "bad_response" };

    const json: unknown = await res.json().catch(() => null);
    return parseOffResponse(code, json);
  } catch {
    return { found: false, reason: "network_error" };
  }
}

/** Scale per-100g macros to a gram amount. Returns whole-number-friendly macros. */
export function macrosForGrams(
  per100g: NormalizedFood["per100g"],
  grams: number,
): { calories: number; proteinG: number; carbsG: number; fatG: number } {
  const factor = grams / 100;
  const scale = (v: number | null) => Math.round(((v ?? 0) * factor) * 10) / 10;
  return {
    calories: Math.round((per100g.calories ?? 0) * factor),
    proteinG: scale(per100g.proteinG),
    carbsG: scale(per100g.carbsG),
    fatG: scale(per100g.fatG),
  };
}
