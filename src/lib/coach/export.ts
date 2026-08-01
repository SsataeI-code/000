import { createClient } from "@/lib/supabase/server";

/**
 * Gather a client's full history for export (§13 "export available — nobody's
 * history is held hostage"; §16 "never skip … export"). RLS-scoped to the
 * caller, so this only returns what they're allowed to read (the client
 * themselves, their coach, or the owner). Defensive: a failed table read yields
 * an empty list, never a thrown export.
 */
export async function gatherClientExport(clientId: string) {
  const supabase = await createClient();

  const [
    profile,
    clientProfile,
    nutritionTargets,
    foodLogs,
    habits,
    habitLogs,
    waterLogs,
    bodyMeasurements,
    meals,
  ] = await Promise.all([
    supabase.from("profiles").select("id,display_name,role,created_at").eq("id", clientId).maybeSingle(),
    supabase.from("client_profiles").select("*").eq("id", clientId).maybeSingle(),
    supabase.from("nutrition_targets").select("*").eq("client_id", clientId).order("created_at", { ascending: true }),
    supabase.from("food_logs").select("*").eq("client_id", clientId).order("log_date", { ascending: true }),
    supabase.from("habits").select("*").eq("client_id", clientId).order("created_at", { ascending: true }),
    supabase.from("habit_logs").select("*").eq("client_id", clientId).order("log_date", { ascending: true }),
    supabase.from("water_logs").select("*").eq("client_id", clientId).order("log_date", { ascending: true }),
    supabase.from("body_measurements").select("*").eq("client_id", clientId).order("log_date", { ascending: true }),
    supabase.from("meals").select("*").eq("owner_id", clientId).order("created_at", { ascending: true }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    schema: "total-form-fitness/client-export@1",
    clientId,
    profile: profile.data ?? null,
    clientProfile: clientProfile.data ?? null,
    nutritionTargets: nutritionTargets.data ?? [],
    foodLogs: foodLogs.data ?? [],
    habits: habits.data ?? [],
    habitLogs: habitLogs.data ?? [],
    waterLogs: waterLogs.data ?? [],
    bodyMeasurements: bodyMeasurements.data ?? [],
    meals: meals.data ?? [],
  };
}
