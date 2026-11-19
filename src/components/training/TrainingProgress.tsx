"use client";

import { useState } from "react";
import { LineChart } from "@/components/charts/LineChart";
import type { TrainingProgress, ExerciseProgress } from "@/lib/training/data";

function fmtTime(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  return `${m}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
}
const round = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));

/** Per-exercise bests, chosen by what the exercise tracks. */
function Bests({ ex }: { ex: ExerciseProgress }) {
  const s = ex.summary;
  const tiles: { label: string; value: string }[] = [];
  if (s.topWeight != null) tiles.push({ label: "Top set", value: `${round(s.topWeight)}${s.topWeightReps != null ? ` × ${s.topWeightReps}` : ""}` });
  if (s.bestE1rm != null) tiles.push({ label: "Best e1RM", value: `${round(s.bestE1rm)}` });
  if (ex.tracking === "bodyweight_reps" || ex.tracking === "reps") { if (s.bestReps != null) tiles.push({ label: "Best reps", value: `${s.bestReps}` }); }
  if (ex.tracking === "time" && s.bestTimeSec != null) tiles.push({ label: "Best time", value: fmtTime(s.bestTimeSec) });
  if (ex.tracking === "distance_time") {
    if (s.bestDistance != null) tiles.push({ label: "Best dist", value: `${round(s.bestDistance)}` });
    if (s.bestTimeSec != null) tiles.push({ label: "Best time", value: fmtTime(s.bestTimeSec) });
  }
  if (s.totalVolume > 0) tiles.push({ label: "Volume", value: s.totalVolume.toLocaleString() });
  tiles.push({ label: "Sessions", value: `${s.sessionCount}` });

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-hairline bg-surface p-3">
          <p className="font-display text-2xl leading-none text-ink">{t.value}</p>
          <p className="mt-1 font-label text-sm uppercase tracking-wide text-ink/55">{t.label}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Training progress & stats (Phase 3). Overview up top, then a per-exercise
 * breakdown: pick an exercise to see its bests, volume, and a trend chart of
 * the metric that matters for it (e1RM, reps, time or distance). Automatic
 * personal bests — all derived from logged sets, nothing invented.
 */
export function TrainingProgress({ progress }: { progress: TrainingProgress }) {
  const { overview, exercises } = progress;
  const [selected, setSelected] = useState(0);

  if (exercises.length === 0) {
    return <p className="rounded-2xl border border-hairline bg-surface shadow-card p-5 font-body text-sm text-ink/60">No training data yet — log a workout and progress shows up here.</p>;
  }

  const ex = exercises[Math.min(selected, exercises.length - 1)];
  const s = ex.summary;
  const fmt = s.metric === "time" ? (n: number) => fmtTime(n) : (n: number) => round(n);

  return (
    <div className="flex flex-col gap-5">
      {/* Overview */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Overview label="This week" value={`${overview.sessionsThisWeek}`} sub="sessions" />
        <Overview label="Per week" value={`${overview.sessionsPerWeek}`} sub="avg" />
        <Overview label="Week streak" value={`${overview.activeWeekStreak}`} sub={overview.activeWeekStreak === 1 ? "week" : "weeks"} />
        <Overview label="Total" value={`${overview.totalSessions}`} sub="sessions" />
      </div>

      {/* Exercise picker */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Exercises">
        {exercises.map((e, i) => (
          <button
            key={e.exerciseId}
            type="button"
            onClick={() => setSelected(i)}
            aria-pressed={i === selected}
            className={`min-h-tap border px-2.5 py-1 font-body text-sm ${i === selected ? "border-red bg-red text-white" : "border-hairline bg-surface text-ink/60 hover:border-ink"}`}
          >
            {e.name}
          </button>
        ))}
      </div>

      {/* Selected exercise */}
      <section className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface shadow-card p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-xl text-ink">{ex.name}</h3>
          <span className="font-label text-sm uppercase tracking-wide text-ink/45">{s.metricLabel} over time</span>
        </div>
        <Bests ex={ex} />
        <LineChart
          points={s.series}
          color="#e10600"
          ariaLabel={`${ex.name} ${s.metricLabel} over time`}
          formatValue={fmt}
        />
      </section>
    </div>
  );
}

function Overview({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-grad-elevated p-4 text-center text-white shadow-card">
      <p className="font-display text-3xl toon-shadow">{value}</p>
      <p className="mt-0.5 font-label text-sm uppercase tracking-wide text-white/60">{label}</p>
      <p className="font-body text-sm text-white/45">{sub}</p>
    </div>
  );
}
