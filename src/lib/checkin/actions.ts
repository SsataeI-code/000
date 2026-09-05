"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { getClientDay } from "@/lib/time/server";
import { getClientCoachId } from "@/lib/messages/data";
import { notify } from "@/lib/notifications/data";
import { weekStartOf } from "@/lib/checkin/data";

export interface CheckInState {
  error?: string;
  ok?: boolean;
}

const LB_PER_KG = 2.20462;

/**
 * Submit (or update) this week's check-in — one per client per week (§ weekly
 * accountability ritual). Weight also flows into body_measurements so the trend
 * stays the single source of truth. The coach is notified.
 */
export async function submitCheckinAction(_prev: CheckInState, formData: FormData): Promise<CheckInState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };

  const weightRaw = Number(formData.get("weight"));
  const unit = formData.get("unit") === "kg" ? "kg" : "lb";
  const hasWeight = Number.isFinite(weightRaw) && weightRaw > 0;
  const weightKg = hasWeight ? (unit === "kg" ? weightRaw : weightRaw / LB_PER_KG) : null;

  const energyRaw = Number(formData.get("energy"));
  const energy = energyRaw >= 1 && energyRaw <= 5 ? Math.round(energyRaw) : null;
  const win = String(formData.get("win") ?? "").trim().slice(0, 1000) || null;
  const focus = String(formData.get("focus") ?? "").trim().slice(0, 1000) || null;

  if (!hasWeight && energy == null && !win && !focus) return { error: "Add at least one thing." };

  const today = await getClientDay(user.id);
  const weekStart = weekStartOf(today);
  const supabase = await createClient();

  const { error } = await supabase
    .from("check_ins")
    .upsert(
      { client_id: user.id, week_start: weekStart, weight_kg: weightKg, energy, win, focus },
      { onConflict: "client_id,week_start" },
    );
  if (error) return { error: "Couldn't save your check-in — try again." };

  // Weight → body_measurements (the trend source), one per day.
  if (weightKg != null) {
    await supabase
      .from("body_measurements")
      .upsert({ client_id: user.id, log_date: today, weight_kg: weightKg }, { onConflict: "client_id,log_date" });
  }

  try {
    const coachId = await getClientCoachId(user.id);
    if (coachId && coachId !== user.id) {
      await notify({
        recipientId: coachId,
        kind: "system",
        title: "New weekly check-in",
        body: `${user.profile?.display_name ?? "A client"} checked in for the week.`,
        link: `/coach/clients/${user.id}`,
      });
    }
  } catch {
    /* best-effort */
  }

  revalidatePath("/client");
  revalidatePath("/client/checkin");
  return { ok: true };
}
