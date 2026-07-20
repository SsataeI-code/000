"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { getClientProfile } from "@/lib/nutrition/data";
import { computeTargets } from "@/lib/nutrition/targets";
import { starterHabits } from "@/lib/habits/starter";
import { isHabitCategory } from "@/lib/habits/ideas";
import type {
  ActivityLevel,
  DietPreference,
  Goal,
  Intake,
  Sex,
} from "@/lib/nutrition/types";

export interface OnboardingState {
  error?: string;
}

const SEXES: Sex[] = ["male", "female"];
const ACTIVITIES: ActivityLevel[] = ["sedentary", "light", "moderate", "very", "athlete"];
const GOALS: Goal[] = ["lose", "maintain", "recomp", "gain", "habits_only"];
const DIETS: DietPreference[] = ["balanced", "low_carb", "low_fat"];

function oneOf<T extends string>(value: FormDataEntryValue | null, allowed: T[]): T | null {
  const v = typeof value === "string" ? value : "";
  return (allowed as string[]).includes(v) ? (v as T) : null;
}

function num(value: FormDataEntryValue | null): number | null {
  const s = typeof value === "string" ? value.trim() : "";
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const LB_TO_KG = 0.453592;
const IN_TO_CM = 2.54;

/** Resolve weight to kg from either unit. */
function resolveWeightKg(form: FormData): number | null {
  const unit = form.get("weight_unit");
  const w = num(form.get("weight"));
  if (w === null) return null;
  return unit === "kg" ? w : w * LB_TO_KG;
}

/** Resolve height to cm from cm, or from feet + inches. */
function resolveHeightCm(form: FormData): number | null {
  const unit = form.get("height_unit");
  if (unit === "cm") return num(form.get("height_cm"));
  const ft = num(form.get("height_ft"));
  const inch = num(form.get("height_in")) ?? 0;
  if (ft === null) return null;
  return (ft * 12 + inch) * IN_TO_CM;
}

/**
 * First-run intake (§8). Validates, saves the client profile, computes PN
 * targets, and stores them so Today has real rings from day one. The coach is
 * free to adjust these later (§5B) — this just seeds sensible defaults.
 */
export async function saveOnboardingAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const sex = oneOf(formData.get("sex"), SEXES);
  const age = num(formData.get("age"));
  const heightCm = resolveHeightCm(formData);
  const weightKg = resolveWeightKg(formData);
  const activity = oneOf(formData.get("activity"), ACTIVITIES);
  const goal = oneOf(formData.get("goal"), GOALS) ?? "maintain";
  const dietPreference = oneOf(formData.get("diet_preference"), DIETS) ?? "balanced";

  if (!sex || !activity || age === null || heightCm === null || weightKg === null) {
    return { error: "Fill in a little more and we'll set your targets." };
  }
  if (age < 13 || age > 100 || heightCm < 90 || heightCm > 250 || weightKg < 25 || weightKg > 400) {
    return { error: "Those numbers look off — double-check age, height, and weight." };
  }

  // The client must choose or write one habit of their own (§5A ownership).
  const ownHabit = String(formData.get("own_habit") ?? "").trim();
  if (!ownHabit) {
    return { error: "Pick or write one habit to make your own — that's the whole point." };
  }
  const ownCategoryRaw = String(formData.get("own_habit_category") ?? "");
  const ownCategory = isHabitCategory(ownCategoryRaw) ? ownCategoryRaw : "movement";

  const intake: Intake = { sex, age, heightCm, weightKg, activity, goal, dietPreference };
  const targets = computeTargets(intake);

  const supabase = await createClient();

  const { error: profileError } = await supabase.from("client_profiles").upsert({
    id: user.id,
    sex,
    age,
    height_cm: heightCm,
    weight_kg: weightKg,
    activity,
    goal,
    diet_preference: dietPreference,
    onboarded_at: new Date().toISOString(),
  });
  if (profileError) return { error: "Couldn't save that — give it another try." };

  const { error: targetError } = await supabase.from("nutrition_targets").insert({
    client_id: user.id,
    calories: targets.calories,
    protein_g: targets.proteinG,
    carbs_g: targets.carbsG,
    fat_g: targets.fatG,
    method: "pn",
  });
  if (targetError) return { error: "Couldn't save your targets — give it another try." };

  // Seed tailored starter habits so day one has the right things to check off
  // (§8). Only if the client has none yet — they/the coach can edit from here.
  const { count } = await supabase
    .from("habits")
    .select("id", { count: "exact", head: true })
    .eq("client_id", user.id);
  if (!count) {
    const seeds = starterHabits(goal, activity);
    const rows = [
      // Their own habit first (position 0) — it's the one that's theirs.
      {
        client_id: user.id,
        created_by: user.id,
        name: ownHabit,
        category: ownCategory,
        type: "checkbox" as const,
        target: null,
        unit: null,
        cadence: "daily" as const,
        why: "You chose this one — make it stick.",
        position: 0,
      },
      ...seeds.map((s, i) => ({
        client_id: user.id,
        created_by: user.id,
        name: s.name,
        category: s.category,
        type: s.type,
        target: s.target,
        unit: s.unit,
        cadence: s.cadence,
        why: s.why,
        position: i + 1,
      })),
    ];
    await supabase.from("habits").insert(rows);
  }

  redirect("/client");
}

/**
 * Recalculate targets (§5B — every 4–6 weeks or after a weight change). Uses the
 * stored profile and the latest logged body weight, inserts fresh targets, and
 * syncs the profile weight. Triggered by the monthly review nudge.
 */
export async function recalcTargetsAction(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const profile = await getClientProfile(user.id);
  if (!profile || !profile.sex || !profile.activity || profile.age == null || profile.height_cm == null) {
    return;
  }

  const supabase = await createClient();
  const { data: latestBody } = await supabase
    .from("body_measurements")
    .select("weight_kg")
    .eq("client_id", user.id)
    .not("weight_kg", "is", null)
    .order("log_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const weightKg = latestBody?.weight_kg != null ? Number(latestBody.weight_kg) : profile.weight_kg;
  if (weightKg == null) return;

  const targets = computeTargets({
    sex: profile.sex,
    age: profile.age,
    heightCm: Number(profile.height_cm),
    weightKg,
    activity: profile.activity,
    goal: profile.goal,
    dietPreference: profile.diet_preference,
  });

  await supabase.from("nutrition_targets").insert({
    client_id: user.id,
    calories: targets.calories,
    protein_g: targets.proteinG,
    carbs_g: targets.carbsG,
    fat_g: targets.fatG,
    method: "pn",
  });
  if (latestBody?.weight_kg != null) {
    await supabase.from("client_profiles").update({ weight_kg: weightKg }).eq("id", user.id);
  }
  revalidatePath("/client");
}
