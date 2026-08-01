import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getHabits, getHabitLogs, completedDatesByHabit } from "@/lib/habits/data";
import { getFoodLogsSince, getClientProfile } from "@/lib/nutrition/data";
import { getBodyMeasurements } from "@/lib/body/data";
import { consistency, currentStreak, isScheduledOn, isoDate, addDays, FREEZE_BUDGET } from "@/lib/habits/streaks";
import { weightTrend, trendChangeKg } from "@/lib/body/trend";
import { clientWeeklyRecap } from "@/lib/reports/weekly";

export const dynamic = "force-dynamic";

/** The client's weekly recap (§12) — wins + 1–3 forgiving things to work on. */
export default async function ClientReportPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [habits, habitLogs, foodLogs, measurements, profile] = await Promise.all([
    getHabits(user.id),
    getHabitLogs(user.id),
    getFoodLogsSince(user.id, 7),
    getBodyMeasurements(user.id),
    getClientProfile(user.id),
  ]);

  const now = new Date();
  const byHabit = completedDatesByHabit(habitLogs);

  // Average weekly consistency across habits.
  const habitConsistency =
    habits.length === 0
      ? 0
      : habits.reduce((sum, h) => sum + consistency(h, byHabit.get(h.id) ?? new Set<string>(), now, 7), 0) / habits.length;

  // Perfect days in the last 7 (every scheduled habit checked off).
  let perfectDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(now, -i);
    const iso = isoDate(d);
    const due = habits.filter((h) => isScheduledOn(h, d));
    if (due.length > 0 && due.every((h) => (byHabit.get(h.id) ?? new Set<string>()).has(iso))) perfectDays++;
  }

  const bestCurrentStreak = habits.reduce(
    (m, h) => Math.max(m, currentStreak(h, byHabit.get(h.id) ?? new Set<string>(), now, FREEZE_BUDGET)),
    0,
  );

  const daysLoggedFood = new Set(foodLogs.map((l) => l.log_date)).size;

  // Weight change over ~the last week.
  const weekMeasurements = measurements.filter((m) => m.log_date >= isoDate(addDays(now, -8)));
  const trend = weightTrend(weekMeasurements);
  const changeKg = trend.length >= 2 ? trendChangeKg(trend) : null;
  const weightChangeLb = changeKg == null ? null : Math.round(changeKg * 2.20462 * 10) / 10;

  const recap = clientWeeklyRecap({
    habitConsistency,
    perfectDays,
    daysLoggedFood,
    currentStreak: bestCurrentStreak,
    weightChangeLb,
    goal: profile?.goal ?? null,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Your week</p>
          <h1 className="mt-1 text-4xl text-ink">Weekly recap</h1>
        </div>
        <Link href="/client" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Done
        </Link>
      </div>

      <section aria-label="Wins" className="flex flex-col gap-3 border border-hairline bg-surface p-5">
        <h2 className="font-label text-xs uppercase tracking-wide text-success">Wins</h2>
        <ul className="flex flex-col gap-2">
          {recap.wins.map((w, i) => (
            <li key={i} className="flex items-start gap-2 font-body text-base text-ink">
              <span aria-hidden className="mt-1 h-2 w-2 shrink-0 bg-success" />
              {w}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="To work on" className="flex flex-col gap-3 border border-hairline bg-surface p-5">
        <h2 className="font-label text-xs uppercase tracking-wide text-ink/50">To work on</h2>
        <ul className="flex flex-col gap-2">
          {recap.focus.map((f, i) => (
            <li key={i} className="flex items-start gap-2 font-body text-base text-ink">
              <span aria-hidden className="mt-1 h-2 w-2 shrink-0 bg-red" />
              {f}
            </li>
          ))}
        </ul>
      </section>

      <p className="font-body text-sm text-ink/50">
        Fresh numbers every week, straight from what you logged. Questions? <Link href="/client/messages" className="text-red underline underline-offset-4">Message your coach</Link>.
      </p>
    </div>
  );
}
