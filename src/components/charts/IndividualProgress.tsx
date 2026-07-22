import type { ReactNode } from "react";
import type { BodyMeasurement, FoodLog, Habit, HabitLog, NutritionTargetRow } from "@/lib/types/db";
import { weightTrend, kgToLb } from "@/lib/body/trend";
import { completedDatesByHabit } from "@/lib/habits/data";
import { longestStreak } from "@/lib/habits/streaks";
import {
  lastNDates,
  dailyCalories,
  dailyMacro,
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
 * a key-stats strip plus weight, food-logging, protein, body-fat, and
 * consistency graphs — reused on the coach deep-dive and the client's own
 * screens so both sides see the exact same numbers.
 */
export function IndividualProgress({
  measurements,
  foodLogs,
  habits,
  habitLogs,
  targets,
  days = 30,
  toggle,
}: {
  measurements: BodyMeasurement[];
  foodLogs: FoodLog[];
  habits: Habit[];
  habitLogs: HabitLog[];
  targets: NutritionTargetRow | null;
  days?: number;
  toggle?: ReactNode;
}) {
  const dates = lastNDates(days);
  const cutoff = dates[0];
  const windowed = measurements.filter((m) => m.log_date >= cutoff);

  // Weight
  const trend = weightTrend(windowed);
  const weightPoints: SeriesPoint[] = trend.map((t) => ({ date: t.date, value: kgToLb(t.weightKg) }));
  const weightAvg: SeriesPoint[] = trend.map((t) => ({ date: t.date, value: kgToLb(t.avgKg) }));
  const latestWeight = trend.length ? kgToLb(trend[trend.length - 1].avgKg) : null;
  let weightRate: number | null = null;
  let weightChange: number | null = null;
  if (trend.length >= 2) {
    const first = trend[0];
    const last = trend[trend.length - 1];
    weightChange = kgToLb(last.avgKg - first.avgKg);
    const spanDays = Math.max(1, (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86_400_000);
    weightRate = Math.round((weightChange / spanDays) * 7 * 10) / 10;
  }

  // Body-fat trend (only if they log it)
  const bfPoints: SeriesPoint[] = windowed
    .filter((m) => m.body_fat_pct != null)
    .map((m) => ({ date: m.log_date, value: Number(m.body_fat_pct) }));

  // Food logging + protein (PN's first-priority macro)
  const calSeries = dailyCalories(foodLogs, dates);
  const proteinSeries = dailyMacro(foodLogs, "protein_g", dates);
  const avgCals = seriesMean(calSeries.map((p) => ({ ...p, value: p.value && p.value > 0 ? p.value : null })));
  const avgProtein = seriesMean(proteinSeries.map((p) => ({ ...p, value: p.value && p.value > 0 ? p.value : null })));
  const logged = daysLogged(calSeries);

  // Consistency + streaks
  const completedByHabit = completedDatesByHabit(habitLogs);
  const consSeries = dailyConsistency(habits, completedByHabit, dates);
  const avgCons = seriesMean(consSeries);
  const bestStreak = habits.reduce((mx, h) => Math.max(mx, longestStreak(completedByHabit.get(h.id) ?? new Set())), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl text-ink">Progress &amp; trends</h2>
        {toggle}
      </div>

      {/* Key stats strip */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Weight" value={latestWeight != null ? `${Math.round(latestWeight)} lb` : "—"} />
        <Stat
          label="Rate / wk"
          value={weightRate == null ? "—" : weightRate === 0 ? "steady" : `${weightRate < 0 ? "−" : "+"}${Math.abs(weightRate)} lb`}
        />
        <Stat label="Avg calories" value={avgCals != null ? String(Math.round(avgCals)) : "—"} sub={targets ? `/ ${targets.calories}` : undefined} />
        <Stat label="Avg protein" value={avgProtein != null ? `${Math.round(avgProtein)} g` : "—"} sub={targets ? `/ ${targets.protein_g} g` : undefined} />
        <Stat label="Days logged" value={`${logged} / ${days}`} />
        <Stat label="Best streak" value={`${bestStreak}d`} sub={avgCons != null ? `${Math.round(avgCons * 100)}% avg` : undefined} />
      </section>

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

      {/* Body fat — only when logged */}
      {bfPoints.length >= 2 ? (
        <section className="border border-hairline bg-surface p-5">
          <p className="mb-3 font-label text-xs uppercase tracking-wide text-ink/50">Body fat %</p>
          <LineChart
            points={bfPoints}
            color="#e10600"
            ariaLabel="Body-fat percentage over time"
            formatValue={(n) => `${Math.round(n * 10) / 10}%`}
          />
        </section>
      ) : null}

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

      {/* Protein */}
      <section className="border border-hairline bg-surface p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Protein / day</p>
          <p className="font-body text-xs text-ink/60">
            {avgProtein != null ? `avg ${Math.round(avgProtein)} g` : "—"}
            {targets ? ` · target ${targets.protein_g} g` : ""}
          </p>
        </div>
        <BarChart
          points={proteinSeries}
          targetLine={targets?.protein_g ?? null}
          color="#1f8a4c"
          overColor="#1f8a4c"
          ariaLabel="Grams of protein logged each day, against the protein target"
          formatValue={(n) => `${Math.round(n)} g`}
        />
        <p className="mt-2 font-body text-xs text-ink/50">Protein is the target we chase first — hitting it protects muscle in a cut and builds it in a gain.</p>
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

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-hairline bg-surface p-3">
      <p className="font-label text-[10px] uppercase tracking-wide text-ink/50">{label}</p>
      <p className="mt-1 font-display text-2xl leading-none text-ink">{value}</p>
      {sub ? <p className="mt-0.5 font-body text-[11px] text-ink/40">{sub}</p> : null}
    </div>
  );
}
