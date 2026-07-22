import { createClient } from "@/lib/supabase/server";
import { computeAttention, type AttentionFlag } from "@/lib/coach/attention";
import { isoDate, addDays } from "@/lib/habits/streaks";
import type { Goal, Sex, ActivityLevel } from "@/lib/types/db";

export interface RosterClient {
  id: string;
  name: string;
  goal: Goal;
  sex: Sex | null;
  age: number | null;
  activity: ActivityLevel | null;
  bodyFatPct: number | null;
  daysSinceActivity: number;
  daysSinceFood: number;
  lastWeightKg: number | null;
  weightChangeKg: number;
  flags: AttentionFlag[];
  score: number;
}

const DAY = 86_400_000;
function daysSince(iso: string | null | undefined): number {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(`${iso}T00:00:00Z`).getTime()) / DAY);
}

/** Newest date per client from a dated table (rows must be ordered desc). */
function latestByClient(rows: { client_id: string; log_date: string }[] | null): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of rows ?? []) if (!map.has(r.client_id)) map.set(r.client_id, r.log_date);
  return map;
}

/**
 * The coach's roster with per-client Needs-Attention scoring (§9). Batched
 * queries (RLS scopes every row to this coach's clients), then pure scoring.
 */
export async function getRoster(coachId: string): Promise<RosterClient[]> {
  const supabase = await createClient();

  const { data: links } = await supabase
    .from("coach_clients")
    .select("client_id")
    .eq("coach_id", coachId)
    .eq("status", "active");
  const ids = (links ?? []).map((l) => l.client_id);
  if (ids.length === 0) return [];

  const since = isoDate(addDays(new Date(), -60));
  const [profiles, cprofiles, food, habitL, water, habits, body] = await Promise.all([
    supabase.from("profiles").select("id,display_name").in("id", ids),
    supabase.from("client_profiles").select("id,goal,sex,age,activity").in("id", ids),
    supabase.from("food_logs").select("client_id,log_date").in("client_id", ids).order("log_date", { ascending: false }),
    supabase.from("habit_logs").select("client_id,log_date").in("client_id", ids).order("log_date", { ascending: false }),
    supabase.from("water_logs").select("client_id,log_date").in("client_id", ids).order("log_date", { ascending: false }),
    supabase.from("habits").select("client_id").in("client_id", ids).eq("active", true),
    supabase.from("body_measurements").select("client_id,log_date,weight_kg,body_fat_pct").in("client_id", ids).gte("log_date", since).not("weight_kg", "is", null).order("log_date", { ascending: true }),
  ]);

  const nameById = new Map((profiles.data ?? []).map((p) => [p.id, p.display_name ?? "Client"]));
  const cprofileById = new Map((cprofiles.data ?? []).map((p) => [p.id, p]));
  const lastFood = latestByClient(food.data);
  const lastHabit = latestByClient(habitL.data);
  const lastWater = latestByClient(water.data);
  const hasHabits = new Set((habits.data ?? []).map((h) => h.client_id));

  // Weight change over the window: earliest vs latest weight per client.
  // Body rows arrive oldest-first, so the last body_fat_pct seen is the latest.
  const weightFirst = new Map<string, number>();
  const weightLast = new Map<string, number>();
  const bodyFatLast = new Map<string, number>();
  for (const row of body.data ?? []) {
    if (!weightFirst.has(row.client_id)) weightFirst.set(row.client_id, Number(row.weight_kg));
    weightLast.set(row.client_id, Number(row.weight_kg));
    if (row.body_fat_pct != null) bodyFatLast.set(row.client_id, Number(row.body_fat_pct));
  }

  const roster: RosterClient[] = ids.map((id) => {
    const dFood = daysSince(lastFood.get(id));
    const dHabit = daysSince(lastHabit.get(id));
    const dWater = daysSince(lastWater.get(id));
    const dActivity = Math.min(dFood, dHabit, dWater);
    const cp = cprofileById.get(id);
    const goal = (cp?.goal as Goal) ?? "maintain";
    const first = weightFirst.get(id);
    const last = weightLast.get(id);
    const hasWeightTrend = first != null && last != null && weightFirst.get(id) !== undefined && (body.data ?? []).filter((b) => b.client_id === id).length >= 2;
    const weightChangeKg = hasWeightTrend ? Math.round((last! - first!) * 10) / 10 : 0;

    const { flags, score } = computeAttention({
      daysSinceActivity: dActivity,
      daysSinceFood: dFood,
      daysSinceHabit: dHabit,
      hasHabits: hasHabits.has(id),
      goal,
      weightChangeKg,
      hasWeightTrend,
    });

    return {
      id,
      name: nameById.get(id) ?? "Client",
      goal,
      sex: (cp?.sex as Sex | null) ?? null,
      age: cp?.age ?? null,
      activity: (cp?.activity as ActivityLevel | null) ?? null,
      bodyFatPct: bodyFatLast.get(id) ?? null,
      daysSinceActivity: dActivity,
      daysSinceFood: dFood,
      lastWeightKg: last ?? null,
      weightChangeKg,
      flags,
      score,
    };
  });

  // Most urgent first; then by name for a stable order.
  roster.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return roster;
}

/** Confirm the current coach actually coaches this client (authorization). */
export async function coachHasClient(coachId: string, clientId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coach_clients")
    .select("id")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}
