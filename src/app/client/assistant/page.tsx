import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { hasAiConfig } from "@/lib/ai/client";
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
import { AnswerHelper } from "@/components/help/AnswerHelper";
import { Assistant } from "@/components/ai/Assistant";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [profile, targets, logs, waterMl, habits, habitLogs] = await Promise.all([
    getClientProfile(user.id),
    getLatestTargets(user.id),
    getTodayFoodLogs(user.id),
    getTodayWaterMl(user.id),
    getHabits(user.id),
    getHabitLogs(user.id),
  ]);
  const totals = totalMacros(logs);
  const byHabit = completedDatesByHabit(habitLogs);
  const now = new Date();
  const todayStr = isoDate(now);
  const DAY = 86_400_000;

  const nextHabit = recommendNextHabit({
    goal: profile?.goal ?? "maintain",
    activity: profile?.activity ?? null,
    existing: habits.map((h) => ({
      category: h.category,
      consistency: consistency(h, byHabit.get(h.id) ?? new Set<string>(), now),
      ageDays: Math.floor((now.getTime() - new Date(h.created_at).getTime()) / DAY),
    })),
  });

  const ctx: HelpContext = {
    firstName: user.profile?.display_name?.split(" ")[0] ?? null,
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

  const aiOn = hasAiConfig();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Quick answers</p>
          <h1 className="mt-1 text-4xl text-ink">Ask</h1>
        </div>
        <Link href="/client" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Done
        </Link>
      </div>

      {/* Always-on, no-AI answer helper */}
      <AnswerHelper ctx={ctx} />

      {/* AI assistant — richer meal planning, only when a key is configured */}
      {aiOn ? (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-2xl text-ink">AI assistant</h2>
            <p className="mt-1 font-body text-sm text-ink/60">Meal plans and swaps, grounded in your day.</p>
          </div>
          <Assistant />
        </section>
      ) : null}

      <p className="font-body text-xs text-ink/50">
        Need a real person? Message your coach any time from the <Link href="/client/messages" className="text-red underline underline-offset-2">Coach</Link> tab.
      </p>
    </div>
  );
}
