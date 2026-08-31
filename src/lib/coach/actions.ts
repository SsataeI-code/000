"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { coachHasClient } from "@/lib/coach/data";
import { isStrictness } from "@/lib/nutrition/strictness";
import { isGoal } from "@/lib/nutrition/types";
import { recomputeTargetsForClient } from "@/lib/nutrition/actions";
import type { HabitCategory, HabitType, HabitCadence } from "@/lib/types/db";

/** A coach may act on a client they coach; the owner on anyone. */
async function authorize(clientId: string): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;
  return user.role === "owner" || (await coachHasClient(user.id, clientId));
}

export interface PlanState {
  error?: string;
  ok?: boolean;
}

function nnInt(v: FormDataEntryValue | null): number {
  const n = Math.round(Number(typeof v === "string" ? v : ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Coach sets/adjusts a client's targets (§9 "editing their goals"). Inserts a
 * fresh nutrition_targets row (history is kept); the latest is active. AI-style
 * automatic changes route through the coach — this IS the coach's tap (§11).
 */
export async function coachSetTargetsAction(
  clientId: string,
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  if (!(await authorize(clientId))) return { error: "Not allowed." };
  const calories = nnInt(formData.get("calories"));
  if (calories <= 0) return { error: "Enter a calorie target." };

  const supabase = await createClient();
  const { error } = await supabase.from("nutrition_targets").insert({
    client_id: clientId,
    calories,
    protein_g: nnInt(formData.get("protein_g")),
    carbs_g: nnInt(formData.get("carbs_g")),
    fat_g: nnInt(formData.get("fat_g")),
    method: "coach",
  });
  if (error) return { error: "Couldn't save — try again." };
  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/client");
  return { ok: true };
}

/**
 * Coach/owner changes a client's goal (§9 "editing their goals"). Updates the
 * stored goal and recomputes PN targets so calories/macros reflect the new goal.
 */
export async function coachSetGoalAction(
  clientId: string,
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  if (!(await authorize(clientId))) return { error: "Not allowed." };
  const goal = formData.get("goal");
  if (!isGoal(goal)) return { error: "Pick a goal." };

  const supabase = await createClient();
  const { error } = await supabase.from("client_profiles").update({ goal }).eq("id", clientId);
  if (error) return { error: "Couldn't save the goal — try again." };

  await recomputeTargetsForClient(clientId, goal);
  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/client");
  return { ok: true };
}

/** Coach/owner regenerates a client's PN targets from their profile + weight. */
export async function coachRecalcTargetsAction(clientId: string): Promise<PlanState> {
  if (!(await authorize(clientId))) return { error: "Not allowed." };
  const ok = await recomputeTargetsForClient(clientId);
  if (!ok) return { error: "Need the client's age, height, weight & activity first." };
  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/client");
  return { ok: true };
}

/**
 * Set a client's nutrition strictness (§B — coach-controlled). Written to the
 * client profile (coach-authorized via client_profiles_write / is_coach_of).
 */
export async function coachSetStrictnessAction(
  clientId: string,
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  if (!(await authorize(clientId))) return { error: "Not allowed." };
  const value = String(formData.get("strictness") ?? "");
  if (!isStrictness(value)) return { error: "Pick a strictness." };

  const supabase = await createClient();
  const { error } = await supabase.from("client_profiles").update({ strictness: value }).eq("id", clientId);
  if (error) return { error: "Couldn't save — try again." };
  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/client");
  return { ok: true };
}

/**
 * Archive a client — remove them from the roster (§13 "departed client"): their
 * active coach link flips to `archived`, so they drop off every roster / queue /
 * stat immediately, but their data is retained (exportable, purged later per the
 * retention rule). Reversible. Any coach may archive their own client; owner any.
 */
export async function archiveClientAction(
  clientId: string,
  _prev: PlanState,
  _formData: FormData,
): Promise<PlanState> {
  if (!(await authorize(clientId))) return { error: "Not allowed." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("coach_clients")
    .update({ status: "archived" })
    .eq("client_id", clientId)
    .eq("status", "active");
  if (error) return { error: "Couldn't archive this client — try again." };
  revalidatePath("/coach");
  revalidatePath("/coach/roster");
  redirect("/coach/roster");
}

/**
 * Permanently delete a client and ALL their data (§13 — this overrides the
 * 1-year retention rule, so it's owner-only and irreversible). Deletes the
 * auth user via the service role; every table cascades from auth.users →
 * profiles → the client's logs/habits/etc. Requires typing DELETE to confirm.
 */
export async function deleteClientAction(
  clientId: string,
  _prev: PlanState,
  _formData: FormData,
): Promise<PlanState> {
  // The client's own coach (or the owner) may permanently delete them. The UI
  // gates this behind a two-step confirm. Deletion runs through a SECURITY
  // DEFINER RPC (no service-role key needed) that cascades from auth.users.
  if (!(await authorize(clientId))) return { error: "Not allowed." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_client", { p_client: clientId });
  if (error) return { error: `Couldn't delete: ${error.message}` };

  revalidatePath("/coach");
  revalidatePath("/coach/roster");
  redirect("/coach/roster");
}

/**
 * Restore an archived client — flip their link back to `active` so they return
 * to the roster. Guards the one-active-coach rule: if the client has since
 * picked up another active coach, we surface a clear message instead of a raw
 * unique-index error. Any coach may restore their own archived client; owner any.
 */
export async function restoreClientAction(
  clientId: string,
  _prev: PlanState,
  _formData: FormData,
): Promise<PlanState> {
  if (!(await authorize(clientId))) return { error: "Not allowed." };
  const supabase = await createClient();

  const { data: active } = await supabase
    .from("coach_clients")
    .select("id")
    .eq("client_id", clientId)
    .eq("status", "active")
    .maybeSingle();
  if (active) return { error: "This client already has an active coach — they can't be restored to two." };

  const { error } = await supabase
    .from("coach_clients")
    .update({ status: "active" })
    .eq("client_id", clientId)
    .eq("status", "archived");
  if (error) return { error: "Couldn't restore this client — try again." };
  revalidatePath("/coach");
  revalidatePath("/coach/roster");
  revalidatePath("/coach/archived");
  redirect("/coach/roster");
}

const CATS: HabitCategory[] = ["nutrition", "movement", "sleep", "mindfulness", "hydration", "recovery"];
const TYPES: HabitType[] = ["checkbox", "counter", "duration", "quantity"];
const CADENCES: HabitCadence[] = ["daily", "weekly_count", "specific_days"];

function oneOf<T extends string>(v: FormDataEntryValue | null, allowed: T[], fallback: T): T {
  const s = typeof v === "string" ? v : "";
  return (allowed as string[]).includes(s) ? (s as T) : fallback;
}
function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Coach/owner builds a habit for a client — the full builder (§5A: coach can
 * add/veto). Same shape as the client's own builder, authorized to this client.
 */
export async function coachAddHabitAction(
  clientId: string,
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const user = await getSessionUser();
  if (!user || !(await authorize(clientId))) return { error: "Not allowed." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name the habit." };

  const cadence = oneOf(formData.get("cadence"), CADENCES, "daily");
  const daysRaw = formData.getAll("days_of_week").map((d) => Number(d)).filter((n) => Number.isInteger(n));
  if (cadence === "specific_days" && daysRaw.length === 0) {
    return { error: "Pick at least one day for a specific-days habit." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("habits").insert({
    client_id: clientId,
    created_by: user.id,
    name,
    category: oneOf(formData.get("category"), CATS, "movement"),
    type: oneOf(formData.get("type"), TYPES, "checkbox"),
    target: numOrNull(formData.get("target")),
    unit: String(formData.get("unit") ?? "").trim() || null,
    cadence,
    times_per_week: cadence === "weekly_count" ? numOrNull(formData.get("times_per_week")) : null,
    days_of_week: cadence === "specific_days" ? daysRaw : null,
    reminder_time: String(formData.get("reminder_time") ?? "").trim() || null,
    why: String(formData.get("why") ?? "").trim() || "Added by your coach.",
    anchor: String(formData.get("anchor") ?? "").trim() || null,
  });
  if (error) return { error: "Couldn't add it — try again." };
  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/client");
  revalidatePath("/client/habits");
  return { ok: true };
}

/** Coach vetoes (archives) a client's habit. RLS restricts to the coach's own. */
export async function coachArchiveHabitAction(habitId: string, clientId: string): Promise<void> {
  if (!(await authorize(clientId))) return;
  const supabase = await createClient();
  await supabase.from("habits").update({ active: false }).eq("id", habitId);
  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/client");
}
