import { createClient } from "@/lib/supabase/server";
import type { Exercise, WorkoutSession, SessionSet, TrainingTrackingType } from "@/lib/types/db";
import { summarizeExercise, trainingOverview, type ExerciseSummary, type SetPoint, type TrainingOverview } from "@/lib/training/progress";

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

export interface ExerciseProgress {
  exerciseId: string;
  name: string;
  tracking: TrainingTrackingType;
  summary: ExerciseSummary;
}
export interface TrainingProgress {
  overview: TrainingOverview;
  exercises: ExerciseProgress[]; // most-trained first
}

/**
 * Everything the progress view needs, assembled server-side so the client
 * component renders without extra round-trips: a per-client overview plus a
 * per-exercise summary (bests, volume, charting series) for every exercise the
 * client has logged. RLS scopes all reads to the viewer's own clients.
 */
export async function getTrainingProgress(clientId: string): Promise<TrainingProgress> {
  const supabase = await createClient();
  const { data: sessionRows } = await supabase
    .from("workout_sessions")
    .select("id,log_date")
    .eq("client_id", clientId);
  const sessions = (sessionRows as Pick<WorkoutSession, "id" | "log_date">[] | null) ?? [];
  const dateById = new Map(sessions.map((s) => [s.id, s.log_date]));
  const sessionDates = sessions.map((s) => s.log_date);

  if (sessions.length === 0) {
    return { overview: trainingOverview([]), exercises: [] };
  }

  const [{ data: setRows }, { data: exRows }] = await Promise.all([
    supabase.from("session_sets").select("session_id,exercise_id,weight,reps,time_sec,distance").in("session_id", sessions.map((s) => s.id)),
    supabase.from("exercises").select("id,name,tracking_type"),
  ]);
  const exById = new Map((exRows ?? []).map((e) => [e.id as string, { name: e.name as string, tracking: e.tracking_type as TrainingTrackingType }]));

  // Group set points by exercise.
  const pointsByExercise = new Map<string, SetPoint[]>();
  for (const s of (setRows as (Pick<SessionSet, "session_id" | "exercise_id" | "weight" | "reps" | "time_sec" | "distance">)[] | null) ?? []) {
    const date = dateById.get(s.session_id);
    if (!date) continue;
    const list = pointsByExercise.get(s.exercise_id) ?? [];
    list.push({ date, weight: s.weight, reps: s.reps, timeSec: s.time_sec, distance: s.distance });
    pointsByExercise.set(s.exercise_id, list);
  }

  const exercises: ExerciseProgress[] = [];
  for (const [exerciseId, points] of pointsByExercise) {
    const meta = exById.get(exerciseId);
    if (!meta) continue;
    exercises.push({ exerciseId, name: meta.name, tracking: meta.tracking, summary: summarizeExercise(points, meta.tracking) });
  }
  exercises.sort((a, b) => b.summary.setCount - a.summary.setCount || a.name.localeCompare(b.name));

  return { overview: trainingOverview(sessionDates), exercises };
}

