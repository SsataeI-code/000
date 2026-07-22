import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getBodyMeasurements } from "@/lib/body/data";
import { weightTrend, trendChangeKg, kgToLb } from "@/lib/body/trend";
import { getFoodLogsSince, getLatestTargets } from "@/lib/nutrition/data";
import { getHabits, getHabitLogs } from "@/lib/habits/data";
import { BodyLogForm } from "@/components/body/BodyLogForm";
import { IndividualProgress } from "@/components/charts/IndividualProgress";

export const dynamic = "force-dynamic";

export default async function BodyPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [measurements, foodLogs, habits, habitLogs, targets] = await Promise.all([
    getBodyMeasurements(user.id),
    getFoodLogsSince(user.id, 30),
    getHabits(user.id),
    getHabitLogs(user.id),
    getLatestTargets(user.id),
  ]);
  const trend = weightTrend(measurements);
  const latest = trend[trend.length - 1];
  const change = trendChangeKg(trend);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl text-ink">Progress</h1>
        <Link href="/client" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Done
        </Link>
      </div>

      {latest ? (
        <section className="border border-hairline bg-surface p-5">
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Weight (trend)</p>
          <p className="mt-1 font-display text-4xl text-ink">{kgToLb(latest.avgKg)} lb</p>
          {trend.length > 1 ? (
            <p className="mt-1 font-body text-sm text-ink/60">
              {change === 0 ? "Holding steady" : `${change < 0 ? "↓" : "↑"} ${Math.abs(kgToLb(Math.abs(change)))} lb since you started tracking`}
            </p>
          ) : null}
        </section>
      ) : (
        <p className="border border-hairline bg-surface p-5 font-body text-sm text-ink/60">
          Log your weight to see your trend. Just a number — the moving average smooths the daily noise.
        </p>
      )}

      {/* Your graphs — weight, food logging, consistency over the last 30 days */}
      <IndividualProgress
        measurements={measurements}
        foodLogs={foodLogs}
        habits={habits}
        habitLogs={habitLogs}
        targets={targets}
        days={30}
      />

      <div>
        <h2 className="mb-3 text-2xl text-ink">Log</h2>
        <BodyLogForm />
      </div>
    </div>
  );
}
