import type { ReactNode } from "react";
import Link from "next/link";
import type { BodyMeasurement, FoodLog, Goal, Habit, HabitLog, NutritionTargetRow } from "@/lib/types/db";
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
import { computeAdherence, adherenceBand } from "@/lib/coach/adherence";

const GOAL_VERB: Record<string, string> = {
  lose: "fat loss",
  gain: "muscle gain",
  maintain: "maintenance",
  recomp: "recomp",
  habits_only: "habits",
};

/** Treat a 0 as "no data that day" so a missed day is a gap, not a spike to zero. */
const gapZero = (s: SeriesPoint[]): SeriesPoint[] => s.map((p) => ({ ...p, value: p.value && p.value > 0 ? p.value : null }));

/**
 * Individual progress (§9). Leads with a weight-vs-goal readout, then the trends
 * a coach actually reads. Every chart plots real data points day-by-day — no
 * combining or weekly averaging, so no logged day disappears (owner request).
 * The range toggle picks the window (week / month / …). Same component on the
 * coach deep-dive and the client's own screen, so both see identical numbers.
 */
export function IndividualProgress({
  measurements,
  foodLogs,
  habits,
  habitLogs,
  targets,
  goal,
  days = 30,
  toggle,
  clientView = false,
}: {
  measurements: BodyMeasurement[];
  foodLogs: FoodLog[];
  habits: Habit[];
  habitLogs: HabitLog[];
  targets: NutritionTargetRow | null;
  goal?: Goal | null;
  days?: number;
  toggle?: ReactNode;
  /** On the client's own screen, make the key-stat tiles tap through to their log. */
  clientView?: boolean;
}) {
  const dates = lastNDates(days);
  const cutoff = dates[0];
  const windowed = measurements.filter((m) => m.log_date >= cutoff);

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

  // Every logged weigh-in in the window, one dot per entry (owner: "every point
  // for every day of entry should be clear"). Unlike the smoothed weekly roll-up,
  // this never collapses days together — the client sees each weigh-in they made.
  const weightEntries: SeriesPoint[] = windowed
    .filter((m) => m.weight_kg != null)
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
    .map((m) => ({ date: m.log_date, value: kgToLb(Number(m.weight_kg)) }));

  // Body fat — one dot per logged measurement, in order (never combined).
  const bfMeasured: SeriesPoint[] = windowed
    .filter((m) => m.body_fat_pct != null)
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
    .map((m) => ({ date: m.log_date, value: Number(m.body_fat_pct) }));
  const hasBf = bfMeasured.length >= 2;

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

  // Adherence score — one number from habits + logging + protein-on-target.
  const adherence = computeAdherence({
    habitConsistency: habits.length > 0 && avgCons != null ? avgCons : undefined,
    loggedRate: days > 0 ? logged / days : undefined,
    proteinOnTarget: avgProtein != null && targets?.protein_g ? Math.min(avgProtein / targets.protein_g, 1) : undefined,
  });
  const band = adherenceBand(adherence);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl text-ink">Progress</h2>
        <div className="flex items-center gap-2">
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
          {/* Weight always shows every weigh-in as its own dot — no weekly roll-up,
              so no logged day disappears (the Weekly/Daily toggle still smooths the
              noisier calorie/protein/habit charts below). */}
          <LineChart
            points={weightEntries}
            color="#e10600"
            ariaLabel="Every logged body-weight entry over time, in pounds"
            formatValue={(nn) => `${Math.round(nn)} lb`}
          />
          {weightEntries.length > 1 ? (
            <p className="mt-1 text-right font-body text-[10px] text-ink/40">{weightEntries.length} weigh-ins · last {days} days</p>
          ) : null}
        </div>
      </section>

      {/* Adherence — one number for "are they doing the work" */}
      {adherence != null ? (
        <section className="flex items-center justify-between gap-4 rounded-2xl border border-hairline bg-grad-elevated p-5 text-white shadow-card">
          <div>
            <p className="font-label text-[10px] uppercase tracking-widest text-white/60">Adherence</p>
            <p className="mt-1 font-display text-5xl leading-none toon-shadow">{adherence}<span className="ml-1 text-2xl text-white/50">/100</span></p>
            <p className="mt-1.5 font-body text-sm text-white/75">Habits, food logging &amp; protein — combined.</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1.5 font-label text-[10px] font-600 uppercase tracking-wide ${
            band.tone === "success" ? "bg-success/20 text-success" : band.tone === "risk" ? "bg-red/20 text-red-ink" : "bg-[#ffb03a]/15 text-[#ffb03a]"
          }`}>{band.label}</span>
        </section>
      ) : null}

      {/* Key stats — on the client's own screen these tap through to their logs */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Avg calories" value={avgCals != null ? String(Math.round(avgCals)) : "—"} sub={targets ? `/ ${targets.calories}` : undefined} href={clientView ? "/client/food" : undefined} />
        <Stat label="Avg protein" value={avgProtein != null ? `${Math.round(avgProtein)} g` : "—"} sub={targets ? `/ ${targets.protein_g} g` : undefined} href={clientView ? "/client/food" : undefined} />
        <Stat label="Days logged" value={`${logged} / ${days}`} sub={`${Math.round((logged / days) * 100)}%`} href={clientView ? "/client/food" : undefined} />
        <Stat label="Habits" value={avgCons != null ? `${Math.round(avgCons * 100)}%` : "—"} sub={`best ${bestStreak}d streak`} href={clientView ? "/client/habits" : undefined} />
      </section>

      {/* Body fat — only when logged */}
      {hasBf ? (
        <Card title="Body fat %">
          <LineChart points={bfMeasured} ariaLabel="Body-fat percentage over time" formatValue={(nn) => `${Math.round(nn * 10) / 10}%`} />
        </Card>
      ) : null}

      {/* Calories */}
      <Card title="Calories" note={avgCals != null ? `avg ${Math.round(avgCals)}${targets ? ` · target ${targets.calories}` : ""}` : undefined}>
        <LineChart points={gapZero(calSeries)} color="#e10600" targetLine={targets?.calories ?? null} ariaLabel="Calories logged each day vs target" formatValue={(nn) => String(Math.round(nn))} />
      </Card>

      {/* Protein */}
      <Card title="Protein" note={avgProtein != null ? `avg ${Math.round(avgProtein)} g${targets ? ` · target ${targets.protein_g} g` : ""}` : undefined}>
        <LineChart points={gapZero(proteinSeries)} color="#34c759" targetLine={targets?.protein_g ?? null} ariaLabel="Protein logged each day vs target" formatValue={(nn) => `${Math.round(nn)}g`} />
      </Card>

      {/* Habit consistency */}
      <Card title="Habit consistency" note={avgCons != null ? `avg ${Math.round(avgCons * 100)}%` : "No habits yet"}>
        <LineChart points={consSeries.map((p) => ({ ...p, value: p.value == null ? null : p.value * 100 }))} color="#34c759" targetLine={100} targetLabel="goal" ariaLabel="Percent of due habits completed each day" formatValue={(nn) => `${Math.round(nn)}%`} />
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

function Stat({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) {
  const inner = (
    <>
      <p className="font-display text-3xl leading-none text-ink">{value}</p>
      <p className="mt-1.5 font-label text-[10px] uppercase tracking-wide text-ink/55">{label}</p>
      {sub ? <p className="mt-0.5 font-body text-[11px] text-ink/40">{sub}</p> : null}
    </>
  );
  const cls = "rounded-xl border border-hairline bg-surface p-3.5";
  return href ? (
    <Link href={href} className={`${cls} block transition-colors hover:border-red`}>{inner}</Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
