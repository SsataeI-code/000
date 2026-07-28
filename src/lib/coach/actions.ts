"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { coachHasClient } from "@/lib/coach/data";
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
