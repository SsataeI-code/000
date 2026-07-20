"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  fetchProductByBarcode,
  isValidBarcode,
  searchProducts,
  type NormalizedFood,
} from "@/lib/food/off";
import { searchGenericFoods } from "@/lib/food/generic-foods";

export type LookupResult =
  | { found: true; product: NormalizedFood; fromCache: boolean }
  | { found: false; reason: "not_found" | "bad_response" | "network_error" };

type FoodProductRow = {
  barcode: string;
  name: string | null;
  brand: string | null;
  image_url: string | null;
  serving_size_g: number | null;
  nutriments: Record<string, number> | null;
};

const MACRO_KEYS = {
  calories: "energy_kcal",
  proteinG: "proteins",
  carbsG: "carbohydrates",
  fatG: "fat",
} as const;

/** Map a cached food_products row to the shared NormalizedFood shape. */
function cachedToNormalized(row: FoodProductRow): NormalizedFood {
  const n = (row.nutriments ?? {}) as Record<string, number>;
  return {
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    imageUrl: row.image_url,
    servingSizeG: row.serving_size_g,
    per100g: {
      calories: n.energy_kcal ?? null,
      proteinG: n.proteins ?? null,
      carbsG: n.carbohydrates ?? null,
      fatG: n.fat ?? null,
    },
    nutrimentsPer100g: n,
    missing: (["calories", "proteinG", "carbsG", "fatG"] as const).filter(
      (k) => n[MACRO_KEYS[k]] === undefined,
    ),
  };
}

/**
 * Resolve a barcode: check the shared product cache first (fast + offline-ish),
 * then Open Food Facts. A hit gets cached so the next client scanning it is
 * instant and the shared data keeps improving (§6). Never throws.
 */
export async function lookupProductAction(barcode: string): Promise<LookupResult> {
  const user = await getSessionUser();
  if (!user) return { found: false, reason: "bad_response" };

  const code = barcode.trim();
  if (!isValidBarcode(code)) return { found: false, reason: "bad_response" };

  const supabase = await createClient();

  // 1. Shared cache.
  const { data: cached } = await supabase
    .from("food_products")
    .select("*")
    .eq("barcode", code)
    .maybeSingle();

  if (cached) {
    return { found: true, product: cachedToNormalized(cached as FoodProductRow), fromCache: true };
  }

  // 2. Open Food Facts.
  const result = await fetchProductByBarcode(code);
  if (!result.found) return result;

  // Cache what we learned (best-effort — a cache miss on write is not fatal).
  const p = result.product;
  const nutriments: Record<string, number> = { ...p.nutrimentsPer100g };
  if (p.per100g.calories !== null) nutriments.energy_kcal = p.per100g.calories;
  await supabase.from("food_products").upsert({
    barcode: code,
    name: p.name,
    brand: p.brand,
    image_url: p.imageUrl,
    serving_size_g: p.servingSizeG,
    nutriments,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });

  return { found: true, product: p, fromCache: false };
}

/**
 * Search foods by name (e.g. "white bread"). Blends the built-in generic
 * reference table (reliable, always-available estimates) with live Open Food
 * Facts results (breadth of branded products). Generics come first and OFF hits
 * with the same name are de-duplicated. Never throws — empty list on failure.
 */
export async function searchFoodsAction(query: string): Promise<NormalizedFood[]> {
  const user = await getSessionUser();
  if (!user) return [];
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = await createClient();

  // Everything ever scanned/confirmed lives in the shared cache — search it so
  // the food database is ever-expanding (the user's own products come back fast).
  const escaped = q.replace(/[%_]/g, (m) => `\\${m}`);
  const { data: cachedRows } = await supabase
    .from("food_products")
    .select("*")
    .ilike("name", `%${escaped}%`)
    .limit(12);

  const generics = searchGenericFoods(q, 6);
  const cached = (cachedRows ?? [])
    .map((r) => cachedToNormalized(r as FoodProductRow))
    .filter((p) => p.name && p.per100g.calories !== null);
  const off = await searchProducts(q, 15);

  // Order: reliable generics, then real scanned products, then live OFF. Dedupe
  // by lowercased name and by barcode.
  const seenNames = new Set<string>();
  const seenCodes = new Set<string>();
  const merged: NormalizedFood[] = [];
  for (const item of [...generics, ...cached, ...off]) {
    const nameKey = item.name?.toLowerCase() ?? "";
    if (nameKey && seenNames.has(nameKey)) continue;
    if (item.barcode && seenCodes.has(item.barcode)) continue;
    if (nameKey) seenNames.add(nameKey);
    if (item.barcode) seenCodes.add(item.barcode);
    merged.push(item);
  }
  return merged.slice(0, 20);
}

export interface LogFoodInput {
  name: string;
  brand?: string | null;
  barcode?: string | null;
  grams?: number | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  source: "scan" | "search" | "manual";
}

export interface LogFoodState {
  error?: string;
  ok?: boolean;
}

function nonNegInt(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
function nonNeg(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0;
}

/** Save a food log for the signed-in client. Macros are validated defensively. */
export async function logFoodAction(input: LogFoodInput): Promise<LogFoodState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };

  const name = (input.name ?? "").trim();
  if (!name) return { error: "Give it a name so you'll recognize it later." };

  const supabase = await createClient();
  const { error } = await supabase.from("food_logs").insert({
    client_id: user.id,
    name,
    brand: input.brand?.trim() || null,
    barcode: input.barcode?.trim() || null,
    grams: input.grams != null && Number.isFinite(input.grams) ? input.grams : null,
    calories: nonNegInt(input.calories),
    protein_g: nonNeg(input.proteinG),
    carbs_g: nonNeg(input.carbsG),
    fat_g: nonNeg(input.fatG),
    source: input.source,
  });

  if (error) return { error: "Couldn't save that log — give it another try." };

  // Save a scanned/confirmed barcode into the shared cache so it's searchable
  // forever and the database keeps growing (§6). Derive per-100g from what was
  // logged; only write if it passes a basic sanity check (calories per 100g in a
  // plausible range) so a fat-finger entry can't poison shared data.
  const barcode = input.barcode?.trim();
  const grams = input.grams != null && Number.isFinite(input.grams) ? Number(input.grams) : 0;
  if (barcode && isValidBarcode(barcode) && grams > 0) {
    const factor = 100 / grams;
    const per100 = {
      energy_kcal: Math.round(nonNegInt(input.calories) * factor),
      proteins: Math.round(nonNeg(input.proteinG) * factor * 10) / 10,
      carbohydrates: Math.round(nonNeg(input.carbsG) * factor * 10) / 10,
      fat: Math.round(nonNeg(input.fatG) * factor * 10) / 10,
    };
    if (per100.energy_kcal > 0 && per100.energy_kcal <= 950) {
      await supabase.from("food_products").upsert({
        barcode,
        name,
        brand: input.brand?.trim() || null,
        serving_size_g: grams,
        nutriments: per100,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      });
    }
  }

  revalidatePath("/client");
  return { ok: true };
}

/** Remove a log (undo a mistake). RLS ensures a client can only delete its own. */
export async function deleteFoodLogAction(id: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("food_logs").delete().eq("id", id).eq("client_id", user.id);
  revalidatePath("/client");
}
