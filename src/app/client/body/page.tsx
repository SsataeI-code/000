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
import { RangeToggle } from "@/components/charts/RangeToggle";
import { parseRange } from "@/lib/charts/series";

export const dynamic = "force-dynamic";

export default async function BodyPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const range = parseRange((await searchParams).range);

  const [measurements, foodLogs, habits, habitLogs, targets] = await Promise.all([
    getBodyMeasurements(user.id),
    getFoodLogsSince(user.id, range),
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

      {/* Your graphs — weight, food logging, protein, consistency */}
      <IndividualProgress
        measurements={measurements}
        foodLogs={foodLogs}
        habits={habits}
        habitLogs={habitLogs}
        targets={targets}
        days={range}
        toggle={<RangeToggle current={range} />}
      />

      <div>
        <h2 className="mb-3 text-2xl text-ink">Log</h2>
        <BodyLogForm />
      </div>
    </div>
  );
}
