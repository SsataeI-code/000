import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { coachHasClient } from "@/lib/coach/data";
import {
  getClientProfile,
  getLatestTargets,
  getTodayFoodLogs,
  totalMacros,
} from "@/lib/nutrition/data";
import { getHabits, getHabitLogs, completedDatesByHabit } from "@/lib/habits/data";
import { consistency, currentStreak } from "@/lib/habits/streaks";
import { getBodyMeasurements, getTodayWaterMl } from "@/lib/body/data";
import { weightTrend, trendChangeKg, kgToLb } from "@/lib/body/trend";
import { DayProgress } from "@/components/nutrition/DayProgress";
import { HabitHeatmap } from "@/components/habits/HabitHeatmap";

export const dynamic = "force-dynamic";

const GOAL_LABEL: Record<string, string> = {
  lose: "Fat loss", gain: "Muscle gain", maintain: "Maintain", recomp: "Recomp", habits_only: "Habits",
};

export default async function ClientDeepDive({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  // Authorization: the coach must coach this client (owner sees everyone).
  if (user.role !== "owner" && !(await coachHasClient(user.id, id))) notFound();

  const supabase = await createClient();
  const { data: nameRow } = await supabase.from("profiles").select("display_name").eq("id", id).maybeSingle();
  const name = nameRow?.display_name ?? "Client";

  const [profile, targets, logs, habits, habitLogs, body, waterMl] = await Promise.all([
    getClientProfile(id),
    getLatestTargets(id),
    getTodayFoodLogs(id),
    getHabits(id),
    getHabitLogs(id),
    getBodyMeasurements(id),
    getTodayWaterMl(id),
  ]);

  const totals = totalMacros(logs);
  const byHabit = completedDatesByHabit(habitLogs);
  const today = new Date();
  const counts: Record<string, number> = {};
  for (const l of habitLogs) if (l.completed) counts[l.log_date] = (counts[l.log_date] ?? 0) + 1;
  const trend = weightTrend(body);
  const latestWeight = trend[trend.length - 1];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Client</p>
          <h1 className="mt-1 text-4xl text-ink">{name}</h1>
        </div>
        <Link href="/coach" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Back
        </Link>
      </div>

      <p className="font-body text-sm text-ink/60">
        Goal: {GOAL_LABEL[profile?.goal ?? "maintain"]}
        {profile?.diet_preference ? ` · ${profile.diet_preference.replace("_", " ")}` : ""}
      </p>

      {/* Nutrition today */}
      {targets ? (
        <div>
          <h2 className="mb-3 text-2xl text-ink">Today&apos;s nutrition</h2>
          <DayProgress
            totals={totals}
            targets={{ calories: targets.calories, proteinG: targets.protein_g, carbsG: targets.carbs_g, fatG: targets.fat_g }}
          />
        </div>
      ) : (
        <p className="border border-hairline bg-surface p-5 font-body text-sm text-ink/60">No targets set yet.</p>
      )}

      {/* Water */}
      <section className="border border-hairline bg-surface p-4">
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Water today</p>
        <p className="mt-1 font-body text-ink/80">
          {Math.round(waterMl / 29.5735)} / {Math.round((profile?.water_goal_ml ?? 2500) / 29.5735)} oz
        </p>
      </section>

      {/* Habits */}
      <div>
        <h2 className="mb-3 text-2xl text-ink">Habits</h2>
        {habits.length === 0 ? (
          <p className="border border-hairline bg-surface p-5 font-body text-sm text-ink/60">No habits yet.</p>
        ) : (
          <>
            <section className="mb-3 border border-hairline bg-surface p-5">
              <HabitHeatmap counts={counts} max={Math.max(1, habits.length)} />
            </section>
            <ul className="flex flex-col divide-y divide-hairline border border-hairline bg-surface">
              {habits.map((h) => {
                const done = byHabit.get(h.id) ?? new Set<string>();
                return (
                  <li key={h.id} className="flex items-center justify-between px-4 py-3">
                    <span className="font-body text-base text-ink">{h.name}</span>
                    <span className="font-body text-xs text-ink/50">
                      {currentStreak(h, done, today)}d streak · {Math.round(consistency(h, done, today) * 100)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Weight */}
      <section className="border border-hairline bg-surface p-5">
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Weight</p>
        {latestWeight ? (
          <>
            <p className="mt-1 font-display text-3xl text-ink">{kgToLb(latestWeight.avgKg)} lb</p>
            {trend.length > 1 ? (
              <p className="mt-1 font-body text-sm text-ink/60">
                {trendChangeKg(trend) === 0
                  ? "Holding steady"
                  : `${trendChangeKg(trend) < 0 ? "↓" : "↑"} ${Math.abs(kgToLb(Math.abs(trendChangeKg(trend))))} lb tracked`}
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-1 font-body text-sm text-ink/60">No weight logged yet.</p>
        )}
      </section>
    </div>
  );
}
