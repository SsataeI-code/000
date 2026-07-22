import { createClient } from "@/lib/supabase/server";
import { computeAttention, type AttentionFlag } from "@/lib/coach/attention";
import { isoDate, addDays } from "@/lib/habits/streaks";
import { lastNDates, type SeriesPoint } from "@/lib/charts/series";
import { reconcileLayout } from "@/lib/coach/dashboard";
import type { Goal, Sex, ActivityLevel, DashboardTilePref } from "@/lib/types/db";

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

export interface RosterSeries {
  dates: string[];
  avgCalories: SeriesPoint[]; // avg calories across clients who logged that day
  avgProtein: SeriesPoint[]; // avg protein (g) across clients who logged that day
  loggingRate: SeriesPoint[]; // % of clients who logged any food that day (0..1)
  avgConsistency: SeriesPoint[]; // avg habit consistency across clients (0..1)
  clientCount: number;
}

/**
 * Roster-wide daily trends over the last `days` (§9 "roster-wide aggregates").
 * Batched, RLS-scoped queries; all math is the shared pure series helpers so it
 * lines up 1:1 with what each client sees individually.
 */
export async function getRosterSeries(coachId: string, days = 30): Promise<RosterSeries> {
  const supabase = await createClient();
  const dates = lastNDates(days);

  const { data: links } = await supabase
    .from("coach_clients")
    .select("client_id")
    .eq("coach_id", coachId)
    .eq("status", "active");
  const ids = (links ?? []).map((l) => l.client_id);
  const empty = dates.map((date) => ({ date, value: null }));
  if (ids.length === 0) {
    return { dates, avgCalories: empty, avgProtein: empty, loggingRate: empty, avgConsistency: empty, clientCount: 0 };
  }

  const since = dates[0];
  const [food, habitL, habits] = await Promise.all([
    supabase.from("food_logs").select("client_id,log_date,calories,protein_g").in("client_id", ids).gte("log_date", since),
    supabase.from("habit_logs").select("client_id,log_date,completed").in("client_id", ids).gte("log_date", since).eq("completed", true),
    supabase.from("habits").select("id,client_id,cadence,days_of_week").in("client_id", ids).eq("active", true),
  ]);

  // Per-client daily calories + protein → average across clients who logged that day.
  const calByClient = new Map<string, Map<string, number>>();
  const proByClient = new Map<string, Map<string, number>>();
  for (const row of food.data ?? []) {
    const c = calByClient.get(row.client_id) ?? new Map<string, number>();
    c.set(row.log_date, (c.get(row.log_date) ?? 0) + (Number(row.calories) || 0));
    calByClient.set(row.client_id, c);
    const p = proByClient.get(row.client_id) ?? new Map<string, number>();
    p.set(row.log_date, (p.get(row.log_date) ?? 0) + (Number(row.protein_g) || 0));
    proByClient.set(row.client_id, p);
  }
  const dailyAvgAcrossClients = (byClient: Map<string, Map<string, number>>) =>
    dates.map((date) => {
      const vals: number[] = [];
      for (const m of byClient.values()) { const v = m.get(date); if (v && v > 0) vals.push(v); }
      return { date, value: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null };
    });
  const avgCalories = dailyAvgAcrossClients(calByClient);
  const avgProtein = dailyAvgAcrossClients(proByClient);
  const loggingRate = dates.map((date) => {
    let logged = 0;
    for (const m of calByClient.values()) if ((m.get(date) ?? 0) > 0) logged++;
    return { date, value: Math.round((logged / ids.length) * 100) / 100 };
  });

  // Per-client consistency (cadence-aware), averaged across clients.
  const habitsByClient = new Map<string, { id: string; cadence: string; days_of_week: number[] | null }[]>();
  for (const h of habits.data ?? []) {
    const arr = habitsByClient.get(h.client_id) ?? [];
    arr.push({ id: h.id, cadence: h.cadence as string, days_of_week: h.days_of_week as number[] | null });
    habitsByClient.set(h.client_id, arr);
  }
  const doneSet = new Set<string>();
  for (const row of habitL.data ?? []) doneSet.add(`${row.client_id}|${row.log_date}`);
  // habit_logs is selected slim (no habit id), so roster consistency is measured
  // as: clients with ≥1 completion that day, over clients who have any habit due
  // that day — an honest roster-level engagement signal (the per-client deep-dive
  // shows the exact cadence-aware ratio).
  const avgConsistency = dates.map((date) => {
    const d = new Date(`${date}T00:00:00Z`);
    let withHabits = 0;
    let engaged = 0;
    for (const [cid, hs] of habitsByClient) {
      const due = hs.some((h) =>
        h.cadence === "specific_days" ? (h.days_of_week ?? []).includes(d.getUTCDay()) : true,
      );
      if (!due) continue;
      withHabits++;
      if (doneSet.has(`${cid}|${date}`)) engaged++;
    }
    return { date, value: withHabits === 0 ? null : Math.round((engaged / withHabits) * 100) / 100 };
  });

  return { dates, avgCalories, avgProtein, loggingRate, avgConsistency, clientCount: ids.length };
}

/** The coach's saved dashboard layout, reconciled against the tile registry. */
export async function getDashboardLayout(coachId: string): Promise<DashboardTilePref[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("coach_prefs").select("dashboard").eq("coach_id", coachId).maybeSingle();
  return reconcileLayout(data?.dashboard);
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
