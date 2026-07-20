import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getHabits, getHabitLogs, completedDatesByHabit } from "@/lib/habits/data";
import { consistency, currentStreak, longestStreak } from "@/lib/habits/streaks";
import { HabitBuilderForm } from "@/components/habits/HabitBuilderForm";
import { HabitManageList, type ManageItem } from "@/components/habits/HabitManageList";
import { HabitHeatmap } from "@/components/habits/HabitHeatmap";
import { seedStarterHabitsAction } from "@/lib/habits/actions";
import type { Habit } from "@/lib/types/db";

export const dynamic = "force-dynamic";

function cadenceLabel(h: Habit): string {
  if (h.cadence === "daily") return "Daily";
  if (h.cadence === "weekly_count") return `${h.times_per_week ?? 1}×/week`;
  const days = (h.days_of_week ?? []).map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(" ");
  return days || "Specific days";
}

export default async function HabitsPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [habits, logs] = await Promise.all([getHabits(user.id), getHabitLogs(user.id)]);
  const byHabit = completedDatesByHabit(logs);
  const today = new Date();

  const items: ManageItem[] = habits.map((h) => {
    const done = byHabit.get(h.id) ?? new Set<string>();
    return {
      id: h.id,
      name: h.name,
      cadenceLabel: cadenceLabel(h),
      streak: currentStreak(h, done, today),
      consistencyPct: Math.round(consistency(h, done, today) * 100),
    };
  });

  // Overall heatmap (completions per day) + records.
  const counts: Record<string, number> = {};
  for (const log of logs) if (log.completed) counts[log.log_date] = (counts[log.log_date] ?? 0) + 1;
  const bestStreak = habits.reduce(
    (best, h) => Math.max(best, longestStreak(byHabit.get(h.id) ?? new Set<string>())),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl text-ink">Habits</h1>
        <Link href="/client" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Done
        </Link>
      </div>

      {habits.length > 0 ? (
        <section className="border border-hairline bg-surface p-5">
          <div className="flex items-baseline justify-between">
            <p className="font-label text-xs uppercase tracking-wide text-ink/50">Consistency</p>
            <p className="font-body text-xs text-ink/60">Best streak: {bestStreak}d</p>
          </div>
          <div className="mt-3">
            <HabitHeatmap counts={counts} max={Math.max(1, habits.length)} />
          </div>
        </section>
      ) : null}

      {habits.length === 0 ? (
        <form action={seedStarterHabitsAction} className="border border-hairline bg-surface p-5">
          <p className="font-body text-sm text-ink/70">
            Want a head start? We&apos;ll add a set of daily habits tailored to your goal — edit or
            remove any of them.
          </p>
          <button
            type="submit"
            className="mt-3 inline-flex min-h-tap items-center bg-red px-5 py-2.5 font-label text-xs font-600 uppercase tracking-wide text-surface hover:bg-red-ink"
          >
            Add my starter habits
          </button>
        </form>
      ) : (
        <HabitManageList items={items} />
      )}

      <div>
        <h2 className="mb-3 text-2xl text-ink">New habit</h2>
        <HabitBuilderForm />
      </div>
    </div>
  );
}
