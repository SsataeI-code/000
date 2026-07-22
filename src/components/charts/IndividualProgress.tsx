import type { BodyMeasurement, FoodLog, Habit, HabitLog, NutritionTargetRow } from "@/lib/types/db";
import { weightTrend, kgToLb } from "@/lib/body/trend";
import { completedDatesByHabit } from "@/lib/habits/data";
import {
  lastNDates,
  dailyCalories,
  dailyConsistency,
  seriesMean,
  daysLogged,
  type SeriesPoint,
} from "@/lib/charts/series";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";

/**
 * The individual stats & graphs block (§9 "full picture … nutrition trends,
 * weight"). Given a client's raw rows, it computes the shared series and draws
 * weight, food-logging, and consistency — reused on the coach deep-dive and the
 * client's own screens so both sides see the exact same numbers.
 */
export function IndividualProgress({
  measurements,
  foodLogs,
  habits,
  habitLogs,
  targets,
  days = 30,
}: {
  measurements: BodyMeasurement[];
  foodLogs: FoodLog[];
  habits: Habit[];
  habitLogs: HabitLog[];
  targets: NutritionTargetRow | null;
  days?: number;
}) {
  const dates = lastNDates(days);

  // Weight
  const trend = weightTrend(measurements);
  const weightPoints: SeriesPoint[] = trend.map((t) => ({ date: t.date, value: kgToLb(t.weightKg) }));
  const weightAvg: SeriesPoint[] = trend.map((t) => ({ date: t.date, value: kgToLb(t.avgKg) }));
  let weightRate: number | null = null;
  let weightChange: number | null = null;
  if (trend.length >= 2) {
    const first = trend[0];
    const last = trend[trend.length - 1];
    weightChange = kgToLb(last.avgKg - first.avgKg);
    const spanDays = Math.max(1, (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86_400_000);
    weightRate = Math.round((weightChange / spanDays) * 7 * 10) / 10;
  }

  // Food logging
  const calSeries = dailyCalories(foodLogs, dates);
  const avgCals = seriesMean(calSeries.map((p) => ({ ...p, value: p.value && p.value > 0 ? p.value : null })));
  const logged = daysLogged(calSeries);

  // Consistency
  const completedByHabit = completedDatesByHabit(habitLogs);
  const consSeries = dailyConsistency(habits, completedByHabit, dates);
  const avgCons = seriesMean(consSeries);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl text-ink">Progress &amp; trends</h2>

      {/* Weight */}
      <section className="border border-hairline bg-surface p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Weight</p>
          <p className="font-body text-xs text-ink/60">
            {weightRate != null
              ? `${weightRate === 0 ? "Holding steady" : `${weightRate < 0 ? "↓" : "↑"} ${Math.abs(weightRate)} lb / wk`}`
              : "Log twice to see a rate"}
          </p>
        </div>
        <LineChart
          points={weightPoints}
          overlay={weightAvg}
          ariaLabel="Body weight over time, in pounds, with a moving-average trend line"
          formatValue={(n) => `${Math.round(n)} lb`}
        />
        {weightChange != null ? (
          <p className="mt-2 font-body text-xs text-ink/50">
            {weightChange === 0 ? "No net change" : `${weightChange < 0 ? "Down" : "Up"} ${Math.abs(weightChange)} lb`} over this window.
            <span className="text-ink/40"> Red line = smoothed trend.</span>
          </p>
        ) : null}
      </section>

      {/* Food logging */}
      <section className="border border-hairline bg-surface p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Calories logged / day</p>
          <p className="font-body text-xs text-ink/60">
            {avgCals != null ? `avg ${Math.round(avgCals)}` : "—"}
            {targets ? ` · target ${targets.calories}` : ""}
          </p>
        </div>
        <BarChart
          points={calSeries}
          targetLine={targets?.calories ?? null}
          ariaLabel="Calories logged each day, against the daily target"
          formatValue={(n) => `${Math.round(n)} cal`}
        />
        <p className="mt-2 font-body text-xs text-ink/50">
          Logged food on <span className="text-ink/70">{logged}</span> of the last {days} days.
          {targets ? <span className="text-ink/40"> Dashed line = calorie target.</span> : null}
        </p>
      </section>

      {/* Consistency */}
      <section className="border border-hairline bg-surface p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Habit consistency / day</p>
          <p className="font-body text-xs text-ink/60">
            {avgCons != null ? `avg ${Math.round(avgCons * 100)}%` : "No habits yet"}
          </p>
        </div>
        <BarChart
          points={consSeries.map((p) => ({ ...p, value: p.value == null ? null : p.value * 100 }))}
          max={100}
          targetLine={100}
          color="#1f8a4c"
          overColor="#1f8a4c"
          ariaLabel="Percent of due habits completed each day"
          formatValue={(n) => `${Math.round(n)}%`}
        />
        <p className="mt-2 font-body text-xs text-ink/50">Share of each day&apos;s due habits that got checked off.</p>
      </section>
    </div>
  );
}
