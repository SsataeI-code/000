"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { getClientDay } from "@/lib/time/server";

export interface LiftFormState {
  error?: string;
  ok?: boolean;
}

function num(v: FormDataEntryValue | null): number {
  const n = Number(typeof v === "string" ? v.trim() : "");
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Log a lift (owner decision, 2026 — strength progress). One row per set-record:
 * exercise, weight, unit, reps, sets. Validated defensively; stamped on the
 * client's local day so it lands with the rest of their day (§2).
 */
export async function logLiftAction(_prev: LiftFormState, formData: FormData): Promise<LiftFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };

  const exercise = String(formData.get("exercise") ?? "").trim();
  if (!exercise) return { error: "Name the exercise (e.g. Bench press)." };
  if (exercise.length > 80) return { error: "That exercise name is too long." };

  const weight = num(formData.get("weight"));
  const reps = num(formData.get("reps"));
  const sets = num(formData.get("sets"));
  const unit = formData.get("unit") === "kg" ? "kg" : "lb";
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!Number.isFinite(weight) || weight < 0 || weight > 5000) return { error: "Enter a valid weight." };
  if (!Number.isFinite(reps) || reps < 0 || reps > 1000) return { error: "Enter valid reps." };
  const setCount = Number.isFinite(sets) && sets >= 1 ? Math.min(100, Math.round(sets)) : 1;

  const supabase = await createClient();
  const { error } = await supabase.from("lift_logs").insert({
    client_id: user.id,
    log_date: await getClientDay(user.id),
    exercise,
    weight: Math.round(weight * 10) / 10,
    unit,
    reps: Math.round(reps),
    sets: setCount,
    note,
  });
  if (error) return { error: "Couldn't save that lift — give it another try." };

  revalidatePath("/client/lifts");
  return { ok: true };
}

/** Delete one of the caller's own lift entries. */
export async function deleteLiftAction(id: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("lift_logs").delete().eq("id", id).eq("client_id", user.id);
  revalidatePath("/client/lifts");
}
