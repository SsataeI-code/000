import { createClient } from "@/lib/supabase/server";
import type { ClientProfile, FoodLog, NutritionTargetRow } from "@/lib/types/db";
import { todayIso } from "@/lib/nutrition/summary";

// Re-export the pure summarizers so callers have one import site.
export { todayIso, totalMacros, isOnboarded } from "@/lib/nutrition/summary";

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
