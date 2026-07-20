"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { isoDate } from "@/lib/habits/streaks";
import type {
  HabitCadence,
  HabitCategory,
  HabitType,
} from "@/lib/types/db";

export interface HabitFormState {
  error?: string;
}

const CATEGORIES: HabitCategory[] = ["nutrition", "movement", "sleep", "mindfulness", "hydration", "recovery"];
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

/** Create a habit (§5A builder). A coach can also create for their client. */
export async function createHabitAction(
  _prev: HabitFormState,
  formData: FormData,
): Promise<HabitFormState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give your habit a name." };

  const cadence = oneOf(formData.get("cadence"), CADENCES, "daily");
  const daysRaw = formData.getAll("days_of_week").map((d) => Number(d)).filter((n) => Number.isInteger(n));

  if (cadence === "specific_days" && daysRaw.length === 0) {
    return { error: "Pick at least one day for a specific-days habit." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("habits").insert({
    client_id: user.id,
    created_by: user.id,
    name,
    category: oneOf(formData.get("category"), CATEGORIES, "movement"),
    type: oneOf(formData.get("type"), TYPES, "checkbox"),
    target: numOrNull(formData.get("target")),
    unit: String(formData.get("unit") ?? "").trim() || null,
    cadence,
    times_per_week: cadence === "weekly_count" ? numOrNull(formData.get("times_per_week")) : null,
    days_of_week: cadence === "specific_days" ? daysRaw : null,
    reminder_time: String(formData.get("reminder_time") ?? "").trim() || null,
    why: String(formData.get("why") ?? "").trim() || null,
    anchor: String(formData.get("anchor") ?? "").trim() || null,
  });
  if (error) return { error: "Couldn't save the habit — give it another try." };

  revalidatePath("/client");
  revalidatePath("/client/habits");
  redirect("/client/habits");
}

/** Toggle a habit's completion for a given day (default today). One-tap check. */
export async function toggleHabitAction(habitId: string, date?: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const day = date ?? isoDate(new Date());
  const supabase = await createClient();

  // Fetch the habit (RLS-scoped) to compute the "completed" value for its type.
  const { data: habit } = await supabase
    .from("habits")
    .select("target,type,client_id")
    .eq("id", habitId)
    .maybeSingle();
  if (!habit || habit.client_id !== user.id) return;

  const { data: existing } = await supabase
    .from("habit_logs")
    .select("id,completed")
    .eq("habit_id", habitId)
    .eq("log_date", day)
    .maybeSingle();

  if (existing?.completed) {
    // Untoggle → remove the log.
    await supabase.from("habit_logs").delete().eq("id", existing.id);
  } else {
    const value = habit.target ?? 1;
    await supabase
      .from("habit_logs")
      .upsert(
        { habit_id: habitId, client_id: user.id, log_date: day, value, completed: true },
        { onConflict: "habit_id,log_date" },
      );
  }
  revalidatePath("/client");
}

/** Archive (soft-delete) a habit. */
export async function deleteHabitAction(id: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("habits").update({ active: false }).eq("id", id).eq("client_id", user.id);
  revalidatePath("/client");
  revalidatePath("/client/habits");
}
