import { createClient } from "@/lib/supabase/server";
import type { ClientProfile, FoodLog, NutritionTargetRow } from "@/lib/types/db";
import { todayIso } from "@/lib/nutrition/summary";

// Re-export the pure summarizers so callers have one import site.
export { todayIso, totalMacros, isOnboarded } from "@/lib/nutrition/summary";

/** Short-lived signed URLs for any food logs that have a photo (private bucket). */
export async function getFoodPhotoUrls(logs: FoodLog[]): Promise<Record<string, string>> {
  const withPhotos = logs.filter((l) => l.photo_path);
  if (withPhotos.length === 0) return {};
  const supabase = await createClient();
  const urls: Record<string, string> = {};
  for (const log of withPhotos) {
    try {
      const { data } = await supabase.storage
        .from("food-photos")
        .createSignedUrl(log.photo_path as string, 3600);
      if (data?.signedUrl) urls[log.id] = data.signedUrl;
    } catch {
      // A missing/expired photo just renders without a thumbnail — never fatal.
    }
  }
  return urls;
}

export async function getClientProfile(clientId: string): Promise<ClientProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_profiles")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();
  return (data as ClientProfile | null) ?? null;
}

/** The client's current (latest) targets, or null if none computed yet. */
export async function getLatestTargets(clientId: string): Promise<NutritionTargetRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("nutrition_targets")
    .select("*")
    .eq("client_id", clientId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as NutritionTargetRow | null) ?? null;
}

export async function getSavedMeals(clientId: string): Promise<import("@/lib/types/db").Meal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meals")
    .select("*")
    .eq("owner_id", clientId)
    .order("created_at", { ascending: false });
  return (data as import("@/lib/types/db").Meal[] | null) ?? [];
}

export async function getTodayFoodLogs(clientId: string): Promise<FoodLog[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("food_logs")
    .select("*")
    .eq("client_id", clientId)
    .eq("log_date", todayIso())
    .order("logged_at", { ascending: false });
  return (data as FoodLog[] | null) ?? [];
}

/** Food logs over the last `days` (for history charts). Ascending by date. */
export async function getFoodLogsSince(clientId: string, days = 30): Promise<FoodLog[]> {
  const supabase = await createClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const { data } = await supabase
    .from("food_logs")
    .select("*")
    .eq("client_id", clientId)
    .gte("log_date", since.toISOString().slice(0, 10))
    .order("log_date", { ascending: true });
  return (data as FoodLog[] | null) ?? [];
}
