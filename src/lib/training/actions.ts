"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { coachHasClient } from "@/lib/coach/data";

export interface LogSetInput {
  exerciseId: string;
  setNo: number;
  weight?: number | null;
  reps?: number | null;
  timeSec?: number | null;
  distance?: number | null;
  rpe?: number | null;
}

export interface LogWorkoutInput {
  clientId: string;
  logDate?: string; // YYYY-MM-DD; defaults to today (UTC) when omitted
  notes?: string | null;
  sets: LogSetInput[];
}

export interface TrainingActionState {
  ok?: boolean;
  sessionId?: string;
  error?: string;
}

const numOrNull = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Log a completed workout for a client (Phase 2 — simple logging). A coach may
 * log for their own client; a client may log their own ('client-logged'). One
 * session + its sets, written in two inserts. Authorized server-side and backed
 * by RLS. Defensive: drops empty sets, clamps to sane ranges, never throws.
 */
export async function logWorkoutAction(input: LogWorkoutInput): Promise<TrainingActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };

  const clientId = String(input.clientId ?? "");
  if (!clientId) return { error: "No client selected." };

  // Who may log for whom, and under which source.
  let source: "coach" | "client";
  let coachId: string | null;
  if (user.role === "client") {
    if (clientId !== user.id) return { error: "You can only log your own workouts." };
    source = "client";
    coachId = null;
  } else if (user.role === "coach" || user.role === "owner") {
    if (user.role !== "owner" && !(await coachHasClient(user.id, clientId))) {
      return { error: "That isn't one of your clients." };
    }
    source = "coach";
    coachId = user.id;
  } else {
    return { error: "Not allowed." };
  }

  // Keep only sets that carry at least one real value.
  const clean = (input.sets ?? [])
    .filter((s) => s && s.exerciseId)
    .map((s, i) => ({
      exercise_id: s.exerciseId,
      set_no: Number.isFinite(s.setNo) ? s.setNo : i + 1,
      weight: clamp(numOrNull(s.weight), 0, 10000),
      reps: clamp(numOrNull(s.reps), 0, 1000),
      time_sec: clamp(numOrNull(s.timeSec), 0, 86_400),
      distance: clamp(numOrNull(s.distance), 0, 1_000_000),
      rpe: clamp(numOrNull(s.rpe), 1, 10),
      completed: true,
    }))
    .filter((s) => s.weight != null || s.reps != null || s.time_sec != null || s.distance != null);

  if (clean.length === 0) return { error: "Add at least one set with a value." };

  const logDate = /^\d{4}-\d{2}-\d{2}$/.test(input.logDate ?? "")
    ? (input.logDate as string)
    : new Date().toISOString().slice(0, 10);
  const notes = (input.notes ?? "").toString().slice(0, 1000).trim() || null;

  const supabase = await createClient();
  const { data: session, error: sErr } = await supabase
    .from("workout_sessions")
    .insert({ client_id: clientId, coach_id: coachId, log_date: logDate, source, status: "completed", notes })
    .select("id")
    .single();
  if (sErr || !session) return { error: "Couldn't save the workout — try again." };

  const { error: setErr } = await supabase
    .from("session_sets")
    .insert(clean.map((s) => ({ ...s, session_id: session.id as string })));
  if (setErr) {
    // Roll back the empty session so we don't leave a header with no sets.
    await supabase.from("workout_sessions").delete().eq("id", session.id);
    return { error: "Couldn't save the sets — try again." };
  }

  revalidatePath(`/coach/clients/${clientId}/train`);
  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/client/train");
  return { ok: true, sessionId: session.id as string };
}

/** Delete a logged workout (and its sets, via cascade). Authorized + RLS-scoped. */
export async function deleteSessionAction(sessionId: string, clientId: string): Promise<TrainingActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };
  const supabase = await createClient();
  const { error } = await supabase.from("workout_sessions").delete().eq("id", sessionId);
  if (error) return { error: "Couldn't delete that — try again." };
  revalidatePath(`/coach/clients/${clientId}/train`);
  revalidatePath("/client/train");
  return { ok: true };
}

function clamp(n: number | null, lo: number, hi: number): number | null {
  if (n == null) return null;
  return Math.min(hi, Math.max(lo, n));
}
