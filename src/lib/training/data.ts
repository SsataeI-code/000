import { createClient } from "@/lib/supabase/server";
import type { Exercise, WorkoutSession, SessionSet } from "@/lib/types/db";

/**
 * Training data reads (Phase 2 — simple logging). Thin, defensive helpers over
 * the training tables; RLS scopes every row (client sees own, coach sees their
 * clients', owner sees all). Kept simple on purpose — the advanced breakdowns
 * and charts layer on top of these later.
 */

/** The exercise picker list: the global library plus the caller's own customs. */
export async function getExercises(): Promise<Exercise[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercises")
    .select("*")
    .order("name", { ascending: true });
  return (data as Exercise[] | null) ?? [];
}

export interface SessionWithSets extends WorkoutSession {
  sets: (SessionSet & { exerciseName: string })[];
}

/** A client's recent workouts, each with its sets and exercise names, newest first. */
export async function getClientSessions(clientId: string, limit = 20): Promise<SessionWithSets[]> {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("client_id", clientId)
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (sessions as WorkoutSession[] | null) ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((s) => s.id);
  const [{ data: setRows }, { data: exRows }] = await Promise.all([
    supabase.from("session_sets").select("*").in("session_id", ids).order("set_no", { ascending: true }),
    supabase.from("exercises").select("id,name"),
  ]);
  const nameById = new Map((exRows ?? []).map((e) => [e.id as string, e.name as string]));
  const setsBySession = new Map<string, (SessionSet & { exerciseName: string })[]>();
  for (const s of (setRows as SessionSet[] | null) ?? []) {
    const list = setsBySession.get(s.session_id) ?? [];
    list.push({ ...s, exerciseName: nameById.get(s.exercise_id) ?? "Exercise" });
    setsBySession.set(s.session_id, list);
  }
  return rows.map((s) => ({ ...s, sets: setsBySession.get(s.id) ?? [] }));
}

/** Count of a client's logged sessions (quick stat). */
export async function getClientSessionCount(clientId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);
  return count ?? 0;
}
