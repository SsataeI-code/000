"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RosterClientBreakdown } from "@/lib/coach/data";
import { computeAdherence, adherenceBand } from "@/lib/coach/adherence";

const GOAL_LABEL: Record<string, string> = {
  lose: "Fat loss", gain: "Muscle gain", maintain: "Maintain", recomp: "Recomp", habits_only: "Habits",
};

const METRICS: { key: string; label: string }[] = [
  { key: "weight", label: "Weight" },
  { key: "calories", label: "Calories" },
  { key: "protein", label: "Protein" },
  { key: "logging", label: "Days logged" },
  { key: "habits", label: "Habits" },
];
const ALL = METRICS.map((m) => m.key);
const STORE_KEY = "tff-roster-metrics";

/**
 * Per-client stat breakdown (§9). Each client is its own row with their own
 * trends — weight (with a sparkline), avg calories/protein vs target, days
 * logged, habit engagement. The coach picks which metrics to show; the choice
 * is remembered on this device.
 */
export function RosterBreakdown({ clients, days }: { clients: RosterClientBreakdown[]; days: number }) {
  const [shown, setShown] = useState<Set<string>>(new Set(ALL));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        const next = new Set(arr.filter((k) => ALL.includes(k)));
        if (next.size > 0) setShown(next);
      }
    } catch {
      /* no stored prefs — show all */
    }
  }, []);

  const toggle = (key: string) => {
    setShown((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      if (next.size === 0) return prev; // keep at least one
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl text-ink">By client</h2>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Metrics to show">
          {METRICS.map((m) => {
            const on = shown.has(m.key);
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => toggle(m.key)}
                aria-pressed={on}
                className={`min-h-tap border px-2.5 py-1 font-label text-[10px] uppercase tracking-wide ${
                  on ? "border-red bg-red text-white" : "border-hairline bg-surface text-ink/50 hover:border-ink"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {clients.length === 0 ? (
        <p className="rounded-2xl border border-hairline bg-surface shadow-card p-5 font-body text-sm text-ink/60">No clients yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline rounded-2xl border border-hairline bg-surface shadow-card">
          {clients.map((c) => (
            <li key={c.id}>
              <Link href={`/coach/clients/${c.id}`} className="flex flex-col gap-2 px-4 py-3 hover:bg-surface-muted">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-body text-base text-ink">{c.name}</span>
                    <span className="block font-label text-[10px] uppercase tracking-wide text-ink/45">{GOAL_LABEL[c.goal] ?? c.goal}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <AdherenceBadge c={c} />
                    {shown.has("weight") ? <Weight c={c} /> : null}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {shown.has("calories") ? (
                    <Metric label="Cals" value={c.avgCalories != null ? String(c.avgCalories) : "—"} sub={c.calorieTarget ? `/ ${c.calorieTarget}` : "on logged days"} />
                  ) : null}
                  {shown.has("protein") ? (
                    <Metric label="Protein" value={c.avgProtein != null ? `${c.avgProtein}g` : "—"} sub={c.proteinTarget ? `/ ${c.proteinTarget}g` : "on logged days"} />
                  ) : null}
                  {shown.has("logging") ? (
                    <Metric label="Logged" value={`${c.daysLogged}/${c.days}`} sub={`${Math.round((c.daysLogged / c.days) * 100)}%`} />
                  ) : null}
                  {shown.has("habits") ? <Metric label="Habits" value={c.habitPct != null ? `${c.habitPct}%` : "—"} /> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="font-body text-[11px] text-ink/40">Averages are over the last {days} days, on days the client logged. Tap a client for the full deep-dive.</p>
    </section>
  );
}

function AdherenceBadge({ c }: { c: RosterClientBreakdown }) {
  const score = computeAdherence({
    habitConsistency: c.habitPct != null ? c.habitPct / 100 : undefined,
    loggedRate: c.days > 0 ? c.daysLogged / c.days : undefined,
    proteinOnTarget: c.avgProtein != null && c.proteinTarget ? Math.min(c.avgProtein / c.proteinTarget, 1) : undefined,
  });
  if (score == null) return null;
  const tone = adherenceBand(score).tone;
  const cls = tone === "success" ? "bg-success/20 text-success" : tone === "risk" ? "bg-red/20 text-red-ink" : "bg-[#ffb03a]/15 text-[#ffb03a]";
  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-sm ${cls}`} title={`Adherence ${score}/100`}>
      {score}
    </span>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-label text-[9px] uppercase tracking-wide text-ink/40">{label}</span>
      <span className="font-body text-sm text-ink">{value}</span>
      {sub ? <span className="font-body text-[10px] text-ink/40">{sub}</span> : null}
    </span>
  );
}

function Weight({ c }: { c: RosterClientBreakdown }) {
  const arrow = c.weightDir === "down" ? "↓" : c.weightDir === "up" ? "↑" : "→";
  const color = c.weightDir === "flat" ? "text-ink/50" : c.weightDir === "down" ? "text-success" : "text-red";
  return (
    <span className="flex shrink-0 items-center gap-2">
      <Sparkline values={c.weightSpark} />
      <span className="text-right">
        <span className="block font-body text-sm text-ink">{c.latestWeightLb != null ? `${c.latestWeightLb} lb` : "—"}</span>
        {c.weightSpark.length >= 2 ? (
          <span className={`block font-body text-[10px] ${color}`}>{arrow} {Math.abs(c.weightChangeLb)} lb</span>
        ) : null}
      </span>
    </span>
  );
}

/** Tiny inline weight sparkline (flat, no axes). */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="inline-block w-[64px]" />;
  const W = 64;
  const H = 22;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => H - 2 - ((v - min) / range) * (H - 4);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="shrink-0">
      <path d={d} fill="none" stroke="#e10600" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={2} fill="#e10600" />
    </svg>
  );
}
