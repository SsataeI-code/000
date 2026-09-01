"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { coachHasClient } from "@/lib/coach/data";
import { getClientProfile } from "@/lib/nutrition/data";
import { suggestMeals, type MealSuggestion } from "@/lib/nutrition/meals";
import { suggestFills, type FoodPick } from "@/lib/nutrition/recommend";
import { isDietPattern, parseAvoid, type DietFilter } from "@/lib/food/diet";
import { notify } from "@/lib/notifications/data";

async function authorize(clientId: string): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;
  return user.role === "owner" || (await coachHasClient(user.id, clientId));
}

export interface RecommendResult {
  meals: MealSuggestion[];
  foods: FoodPick[];
  error?: string;
}

/**
 * Coach meal/food recommender (§9 "helping clients"). Given the macros a client
 * still needs, return meal ideas and single foods that fit — respecting the
 * client's own diet pattern + avoid list, reusing the same engine the client
 * sees so a coach never recommends something the app would hide from them.
 */
export async function coachRecommendAction(
  clientId: string,
  calories: number,
  proteinG: number,
): Promise<RecommendResult> {
  if (!(await authorize(clientId))) return { meals: [], foods: [], error: "Not allowed." };

  const profile = await getClientProfile(clientId);
  const diet: DietFilter = {
    pattern: isDietPattern(profile?.diet_pattern) ? profile.diet_pattern : "anything",
    avoid: parseAvoid(profile?.food_avoid),
  };
  const cals = Math.max(0, Math.round(Number(calories) || 0));
  const protein = Math.max(0, Math.round(Number(proteinG) || 0));
  const fiber = Math.round((14 * (cals || 2000)) / 1000);

  const meals = suggestMeals(
    { remainingProteinG: protein, remainingFiberG: fiber, remainingCalories: cals, shortMicroKeys: [], diet },
    3,
  );
  const fills = suggestFills(
    { remainingProteinG: protein, remainingFiberG: fiber, microTotalsGrams: {}, calories: cals || 2000, sex: profile?.sex ?? null, diet },
    3,
  );
  const foods = fills.flatMap((f) => f.foods).slice(0, 6);

  return { meals, foods };
}

/** Coach sends a food/meal recommendation to the client as a real coach message. */
export async function coachSendRecommendationAction(clientId: string, text: string): Promise<{ ok?: boolean; error?: string }> {
  const user = await getSessionUser();
  if (!user || !(await authorize(clientId))) return { error: "Not allowed." };
  const body = (text ?? "").trim();
  if (!body) return { error: "Nothing to send." };
  if (body.length > 4000) return { error: "That's too long." };

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    coach_id: user.id,
    client_id: clientId,
    sender_id: user.id,
    kind: "coach",
    body,
  });
  if (error) return { error: "Couldn't send — try again." };

  await notify({
    recipientId: clientId,
    kind: "message",
    title: "Meal idea from your coach",
    body: body.slice(0, 140),
    link: "/client/messages",
  });
  revalidatePath(`/coach/messages/${clientId}`);
  return { ok: true };
}
