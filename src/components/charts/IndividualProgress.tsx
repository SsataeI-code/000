import type { ReactNode } from "react";
import type { BodyMeasurement, FoodLog, Goal, Habit, HabitLog, NutritionTargetRow } from "@/lib/types/db";
import { weightTrend, kgToLb } from "@/lib/body/trend";
import { completedDatesByHabit } from "@/lib/habits/data";
import { longestStreak } from "@/lib/habits/streaks";
import {
  lastNDates,
  dailyCalories,
  dailyMacro,
  dailyConsistency,
  movingAverage,
  smoothingWindow,
  seriesMean,
  daysLogged,
  weeklyAverages,
  type SeriesPoint,
  type WeekPoint,
  type ChartView,
} from "@/lib/charts/series";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";

const GOAL_VERB: Record<string, string> = {
  lose: "fat loss",
  gain: "muscle gain",
  maintain: "maintenance",
  recomp: "recomp",
  habits_only: "habits",
};

/** WeekPoint[] → SeriesPoint[] for the line chart (uses the week-start date). */
const asSeries = (weeks: WeekPoint[]): SeriesPoint[] => weeks.map((w) => ({ date: w.startDate, value: w.value }));

/** Treat a 0 as "no data that day" so a missed day is a gap, not a spike to zero. */
const gapZero = (s: SeriesPoint[]): SeriesPoint[] => s.map((p) => ({ ...p, value: p.value && p.value > 0 ? p.value : null }));

/**
 * Individual progress (§9). Leads with a weight-vs-goal readout, then the trends
 * a coach actually reads — weekly averages by default (day-to-day noise smoothed
 * into bars), with a Daily toggle for detail. Same component on the coach
 * deep-dive and the client's own screen, so both see identical numbers.
 */
export function IndividualProgress({
  measurements,
  foodLogs,
  habits,
  habitLogs,
  targets,
  goal,
  view = "weekly",
  days = 30,
  toggle,
  viewToggle,
}: {
  measurements: BodyMeasurement[];
  foodLogs: FoodLog[];
  habits: Habit[];
  habitLogs: HabitLog[];
  targets: NutritionTargetRow | null;
  goal?: Goal | null;
  view?: ChartView;
  days?: number;
  toggle?: ReactNode;
  viewToggle?: ReactNode;
}) {
  const weekly = view === "weekly";
  const dates = lastNDates(days);
  const cutoff = dates[0];
  const windowed = measurements.filter((m) => m.log_date >= cutoff);
  const maWindow = smoothingWindow(days);

  // ---- Weight & goal ----
  const trend = weightTrend(windowed);
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

  // On-pace status vs the client's goal.
  let paceLabel: string | null = null;
  let paceGood: boolean | null = null;
  if (goal && goal !== "habits_only" && weightRate != null) {
    if (goal === "lose") { paceGood = weightRate < -0.1; }
    else if (goal === "gain") { paceGood = weightRate > 0.1; }
    else { paceGood = Math.abs(weightRate) <= 0.35; } // maintain / recomp
    paceLabel = paceGood ? "On track" : weightRate === 0 ? "Holding" : "Off pace";
  }

  // Daily weight (lb) aligned to the window, for the weekly roll-up / daily line.
  const weightByDate = new Map<string, number>();
  for (const t of trend) weightByDate.set(t.date, kgToLb(t.weightKg));
  const weightDaily: SeriesPoint[] = dates.map((d) => ({ date: d, value: weightByDate.get(d) ?? null }));
  const weightWeeks = weeklyAverages(weightDaily);

  // Body fat
  const bfDaily: SeriesPoint[] = dates.map((d) => {
    const m = windowed.find((x) => x.log_date === d && x.body_fat_pct != null);
    return { date: d, value: m ? Number(m.body_fat_pct) : null };
  });
  const hasBf = bfDaily.filter((p) => p.value != null).length >= 2;

  // ---- Nutrition & habits ----
  const calSeries = dailyCalories(foodLogs, dates);
  const proteinSeries = dailyMacro(foodLogs, "protein_g", dates);
  const avgCals = seriesMean(calSeries.map((p) => ({ ...p, value: p.value && p.value > 0 ? p.value : null })));
  const avgProtein = seriesMean(proteinSeries.map((p) => ({ ...p, value: p.value && p.value > 0 ? p.value : null })));
  const logged = daysLogged(calSeries);

  const completedByHabit = completedDatesByHabit(habitLogs);
  const consSeries = dailyConsistency(habits, completedByHabit, dates);
  const avgCons = seriesMean(consSeries);
  const bestStreak = habits.reduce((mx, h) => Math.max(mx, longestStreak(completedByHabit.get(h.id) ?? new Set())), 0);

  const calWeeks = weeklyAverages(calSeries);
  const proteinWeeks = weeklyAverages(proteinSeries);
  const consWeeks = weeklyAverages(consSeries.map((p) => ({ ...p, value: p.value == null ? null : p.value * 100 })));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl text-ink">Progress</h2>
        <div className="flex items-center gap-2">
          {viewToggle}
          {toggle}
        </div>
      </div>

      {/* Weight vs goal — the headline */}
      <section className="rounded-lg border border-hairline bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-label text-[10px] uppercase tracking-wide text-ink/50">Weight</p>
            <p className="mt-1 font-display text-5xl leading-none text-ink">{latestWeight != null ? `${Math.round(latestWeight)}` : "—"}<span className="ml-1 text-2xl text-ink/50">lb</span></p>
            <p className="mt-1.5 font-body text-sm text-ink/70">
              {weightChange == null
                ? "Log twice to see your trend."
                : `${weightChange === 0 ? "No net change" : `${weightChange < 0 ? "Down" : "Up"} ${Math.abs(weightChange)} lb`} in ${days} days · ${
                    weightRate === 0 ? "steady" : `${weightRate! < 0 ? "−" : "+"}${Math.abs(weightRate!)} lb/wk`
                  }`}
            </p>
            {goal && goal !== "habits_only" ? (
              <p className="mt-0.5 font-body text-xs text-ink/50">Goal: {GOAL_VERB[goal] ?? goal}</p>
            ) : null}
          </div>
          {paceLabel ? (
            <span className={`shrink-0 rounded-full px-3 py-1.5 font-label text-[10px] font-600 uppercase tracking-wide ${paceGood ? "bg-success/15 text-success" : "bg-red/15 text-red"}`}>
              {paceLabel}
            </span>
          ) : null}
        </div>
        <div className="mt-4">
          {weekly ? (
            <LineChart
              points={asSeries(weightWeeks)}
              areaColor="#e10600"
              overlayColor="#e10600"
              ariaLabel="Weekly average body weight over time, in pounds"
              formatValue={(nn) => `${Math.round(nn)} lb`}
            />
          ) : (
            <LineChart
              points={trend.map((t) => ({ date: t.date, value: kgToLb(t.weightKg) }))}
              overlay={trend.map((t) => ({ date: t.date, value: kgToLb(t.avgKg) }))}
              ariaLabel="Body weight over time, in pounds, with a smoothed trend line"
              formatValue={(nn) => `${Math.round(nn)} lb`}
            />
          )}
        </div>
      </section>

      {/* Key stats */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Avg calories" value={avgCals != null ? String(Math.round(avgCals)) : "—"} sub={targets ? `/ ${targets.calories}` : undefined} />
        <Stat label="Avg protein" value={avgProtein != null ? `${Math.round(avgProtein)} g` : "—"} sub={targets ? `/ ${targets.protein_g} g` : undefined} />
        <Stat label="Days logged" value={`${logged} / ${days}`} sub={`${Math.round((logged / days) * 100)}%`} />
        <Stat label="Habits" value={avgCons != null ? `${Math.round(avgCons * 100)}%` : "—"} sub={`best ${bestStreak}d streak`} />
      </section>

      {/* Body fat — only when logged */}
      {hasBf ? (
        <Card title="Body fat %">
          {weekly ? (
            <LineChart points={asSeries(weeklyAverages(bfDaily))} ariaLabel="Weekly average body-fat percentage" formatValue={(nn) => `${Math.round(nn * 10) / 10}%`} />
          ) : (
            <LineChart points={bfDaily} overlay={movingAverage(bfDaily, 3)} ariaLabel="Body-fat percentage over time" formatValue={(nn) => `${Math.round(nn * 10) / 10}%`} />
          )}
        </Card>
      ) : null}

      {/* Calories */}
      <Card title="Calories" note={avgCals != null ? `avg ${Math.round(avgCals)}${targets ? ` · target ${targets.calories}` : ""}` : undefined}>
        {weekly ? (
          <BarChart weeks={calWeeks} target={targets?.calories ?? null} ariaLabel="Weekly average calories vs target" formatValue={(nn) => String(Math.round(nn))} />
        ) : (
          <LineChart points={gapZero(calSeries)} overlay={movingAverage(gapZero(calSeries), maWindow)} targetLine={targets?.calories ?? null} ariaLabel="Calories logged each day vs target" formatValue={(nn) => `${Math.round(nn)} cal`} />
        )}
      </Card>

      {/* Protein */}
      <Card title="Protein" note={avgProtein != null ? `avg ${Math.round(avgProtein)} g${targets ? ` · target ${targets.protein_g} g` : ""}` : undefined}>
        {weekly ? (
          <BarChart weeks={proteinWeeks} target={targets?.protein_g ?? null} ariaLabel="Weekly average protein vs target" formatValue={(nn) => `${Math.round(nn)}g`} />
        ) : (
          <LineChart points={gapZero(proteinSeries)} overlay={movingAverage(gapZero(proteinSeries), maWindow)} overlayColor="#34c759" targetLine={targets?.protein_g ?? null} ariaLabel="Protein logged each day vs target" formatValue={(nn) => `${Math.round(nn)} g`} />
        )}
      </Card>

      {/* Habit consistency */}
      <Card title="Habit consistency" note={avgCons != null ? `avg ${Math.round(avgCons * 100)}%` : "No habits yet"}>
        {weekly ? (
          <BarChart weeks={consWeeks} target={100} targetLabel="goal" ariaLabel="Weekly average habit consistency" formatValue={(nn) => `${Math.round(nn)}%`} />
        ) : (
          <LineChart
            points={consSeries.map((p) => ({ ...p, value: p.value == null ? null : p.value * 100 }))}
            overlay={movingAverage(consSeries.map((p) => ({ ...p, value: p.value == null ? null : p.value * 100 })), maWindow)}
            overlayColor="#34c759"
            targetLine={100}
            ariaLabel="Percent of due habits completed each day"
            formatValue={(nn) => `${Math.round(nn)}%`}
          />
        )}
      </Card>
    </div>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-hairline bg-surface p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p className="font-label text-sm uppercase tracking-wide text-ink">{title}</p>
        {note ? <p className="font-body text-xs text-ink/55">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-3.5">
      <p className="font-display text-3xl leading-none text-ink">{value}</p>
      <p className="mt-1.5 font-label text-[10px] uppercase tracking-wide text-ink/55">{label}</p>
      {sub ? <p className="mt-0.5 font-body text-[11px] text-ink/40">{sub}</p> : null}
    </div>
  );
}
