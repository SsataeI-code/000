"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { coachHasClient } from "@/lib/coach/data";
import type { HabitCategory } from "@/lib/types/db";

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

/** Coach assigns a daily habit to a client (§5A: coach can add/veto). */
export async function coachAddHabitAction(
  clientId: string,
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const user = await getSessionUser();
  if (!user || !(await authorize(clientId))) return { error: "Not allowed." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name the habit." };
  const catRaw = String(formData.get("category") ?? "");
  const category = (CATS as string[]).includes(catRaw) ? (catRaw as HabitCategory) : "movement";

  const supabase = await createClient();
  const { error } = await supabase.from("habits").insert({
    client_id: clientId,
    created_by: user.id,
    name,
    category,
    type: "checkbox",
    cadence: "daily",
    why: "Added by your coach.",
  });
  if (error) return { error: "Couldn't add it — try again." };
  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath("/client");
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
