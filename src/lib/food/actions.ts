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
    const n = (cached.nutriments ?? {}) as Record<string, number>;
    const product: NormalizedFood = {
      barcode: code,
      name: cached.name,
      brand: cached.brand,
      imageUrl: cached.image_url,
      servingSizeG: cached.serving_size_g,
      per100g: {
        calories: n.energy_kcal ?? null,
        proteinG: n.proteins ?? null,
        carbsG: n.carbohydrates ?? null,
        fatG: n.fat ?? null,
      },
      nutrimentsPer100g: n,
      missing: (["calories", "proteinG", "carbsG", "fatG"] as const).filter((k) => {
        const map = { calories: "energy_kcal", proteinG: "proteins", carbsG: "carbohydrates", fatG: "fat" };
        return n[map[k]] === undefined;
      }),
    };
    return { found: true, product, fromCache: true };
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

  const generics = searchGenericFoods(q, 6);
  const off = await searchProducts(q, 15);

  const seen = new Set(generics.map((g) => g.name?.toLowerCase()));
  const merged = [...generics];
  for (const item of off) {
    const key = item.name?.toLowerCase();
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
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
