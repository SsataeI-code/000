import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getClientProfile } from "@/lib/nutrition/data";
import { getHabits, getHabitLogs, completedDatesByHabit } from "@/lib/habits/data";
import { currentStreak, FREEZE_BUDGET, isDueToday, isoDate } from "@/lib/habits/streaks";
import { habitGameStats, computeGameState } from "@/lib/habits/game";
import { dayInTimeZone } from "@/lib/time/day";
import { HabitGame } from "@/components/habits/HabitGame";
import { Achievements } from "@/components/habits/Achievements";

export const dynamic = "force-dynamic";

/** Badges & level — the full achievement wall (§4 celebrate wins). */
export default async function AchievementsPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const profile = await getClientProfile(user.id);
  const today = dayInTimeZone(profile?.timezone);
  const now = new Date(`${today}T12:00:00Z`);

  const [habits, habitLogs] = await Promise.all([getHabits(user.id), getHabitLogs(user.id)]);
  const byHabit = completedDatesByHabit(habitLogs);
  const todayStr = isoDate(now);
  const dueToday = habits.filter((h) => isDueToday(h, byHabit.get(h.id) ?? new Set<string>(), now));
  const stats = habitGameStats({
    habits,
    completedByHabit: byHabit,
    totalCompletions: habitLogs.filter((l) => l.completed).length,
    bestCurrentStreak: habits.reduce(
      (m, h) => Math.max(m, currentStreak(h, byHabit.get(h.id) ?? new Set<string>(), now, FREEZE_BUDGET)),
      0,
    ),
    todayDone: dueToday.filter((h) => (byHabit.get(h.id) ?? new Set<string>()).has(todayStr)).length,
    todayDue: dueToday.length,
  });
  const state = computeGameState(stats);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Your progress</p>
          <h1 className="mt-1 text-4xl text-ink">Badges</h1>
        </div>
        <Link href="/client" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Done
        </Link>
      </div>

      {habits.length === 0 ? (
        <p className="rounded-lg border border-hairline bg-surface p-5 font-body text-sm text-ink/60">
          Add a habit and start earning badges — your wall fills up as your streaks grow.
        </p>
      ) : (
        <>
          <HabitGame
            state={state}
            todayDone={stats.todayDone}
            todayDue={stats.todayDue}
            bestStreak={stats.bestStreak}
            currentStreak={stats.bestCurrentStreak}
          />
          <Achievements achievements={state.achievements} />
        </>
      )}
    </div>
  );
}
