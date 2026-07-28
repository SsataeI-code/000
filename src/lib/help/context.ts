import {
  getClientProfile,
  getLatestTargets,
  getTodayFoodLogs,
  totalMacros,
} from "@/lib/nutrition/data";
import { getTodayWaterMl } from "@/lib/body/data";
import { getHabits, getHabitLogs, completedDatesByHabit } from "@/lib/habits/data";
import { isDueToday, isoDate, consistency } from "@/lib/habits/streaks";
import { recommendNextHabit } from "@/lib/habits/recommend";
import type { HelpContext } from "@/lib/help/answer";

const DAY = 86_400_000;

/**
 * Build the no-AI answer helper's context from the client's own live data (§11 —
 * grounded, never invented). Shared by the dedicated Ask page and the floating
 * helper launcher so the fetch logic lives in exactly one place. Degrades
 * gracefully before a profile/targets exist (remaining → null, etc.).
 */
export async function buildHelpContext(
  userId: string,
  displayName: string | null,
): Promise<HelpContext> {
  const [profile, targets, logs, waterMl, habits, habitLogs] = await Promise.all([
    getClientProfile(userId),
    getLatestTargets(userId),
    getTodayFoodLogs(userId),
    getTodayWaterMl(userId),
    getHabits(userId),
    getHabitLogs(userId),
  ]);

  const totals = totalMacros(logs);
  const byHabit = completedDatesByHabit(habitLogs);
  const now = new Date();
  const todayStr = isoDate(now);

  const nextHabit = recommendNextHabit({
    goal: profile?.goal ?? "maintain",
    activity: profile?.activity ?? null,
    existing: habits.map((h) => ({
      category: h.category,
      consistency: consistency(h, byHabit.get(h.id) ?? new Set<string>(), now),
      ageDays: Math.floor((now.getTime() - new Date(h.created_at).getTime()) / DAY),
    })),
  });

  return {
    firstName: displayName?.split(" ")[0] ?? null,
    goal: profile?.goal ?? "maintain",
    remaining: targets
      ? {
          calories: targets.calories - totals.calories,
          proteinG: targets.protein_g - totals.proteinG,
          carbsG: targets.carbs_g - totals.carbsG,
          fatG: targets.fat_g - totals.fatG,
        }
      : null,
    waterOz: waterMl / 29.5735,
    waterGoalOz: (profile?.water_goal_ml ?? 2500) / 29.5735,
    habitsDue: habits
      .filter((h) => isDueToday(h, byHabit.get(h.id) ?? new Set<string>(), now))
      .map((h) => ({ name: h.name, done: (byHabit.get(h.id) ?? new Set<string>()).has(todayStr) })),
    nextHabit: nextHabit ? { name: nextHabit.name, why: nextHabit.why } : null,
  };
}
