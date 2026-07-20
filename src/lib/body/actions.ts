"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { todayIso } from "@/lib/nutrition/summary";
import { lbToKg } from "@/lib/body/trend";

/** Quick-add water (ml). Negative undoes. One-tap on Today (§5 hydration). */
export async function addWaterAction(ml: number): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const amount = Math.round(Number(ml));
  if (!Number.isFinite(amount) || amount === 0) return;
  const supabase = await createClient();
  await supabase.from("water_logs").insert({ client_id: user.id, ml: amount, log_date: todayIso() });
  revalidatePath("/client");
}

export interface MeasurementState {
  error?: string;
  ok?: boolean;
}

function num(v: FormDataEntryValue | null): number | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Log body weight (+ optional body-fat %, measurements) for a day (§5C). */
export async function logMeasurementAction(
  _prev: MeasurementState,
  formData: FormData,
): Promise<MeasurementState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };

  const weight = num(formData.get("weight"));
  const unit = formData.get("weight_unit");
  const weightKg = weight == null ? null : unit === "kg" ? weight : lbToKg(weight);
  const bodyFat = num(formData.get("body_fat_pct"));
  const waist = num(formData.get("waist_cm"));
  const hips = num(formData.get("hips_cm"));

  if (weightKg == null && bodyFat == null && waist == null && hips == null) {
    return { error: "Enter at least a weight or a measurement." };
  }
  if (weightKg != null && (weightKg < 20 || weightKg > 500)) {
    return { error: "That weight looks off — double-check it." };
  }

  const date = String(formData.get("log_date") ?? "").trim() || todayIso();
  const supabase = await createClient();
  const { error } = await supabase.from("body_measurements").upsert(
    {
      client_id: user.id,
      log_date: date,
      weight_kg: weightKg,
      body_fat_pct: bodyFat,
      waist_cm: waist,
      hips_cm: hips,
    },
    { onConflict: "client_id,log_date" },
  );
  if (error) return { error: "Couldn't save that — give it another try." };

  revalidatePath("/client/body");
  revalidatePath("/client");
  return { ok: true };
}
