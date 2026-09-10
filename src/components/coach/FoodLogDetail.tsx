"use client";

import { useMemo, useState } from "react";
import type { FoodLog } from "@/lib/types/db";

type MacroKey = "calories" | "protein_g" | "carbs_g" | "fat_g";
type SortKey = "log_date" | MacroKey;

const MACROS: { key: MacroKey; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "" },
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "carbs_g", label: "Carbs", unit: "g" },
  { key: "fat_g", label: "Fat", unit: "g" },
];

function md(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/**
 * Every food a client logged, as a coach-readable table. Tap a macro to sort by
 * it (biggest first) and see all the inputs and their values (owner request).
 * Totals for the window sit up top so the number the coach clicked from lines up.
 */
export function FoodLogDetail({ logs, initialSort = "log_date" }: { logs: FoodLog[]; initialSort?: SortKey }) {
  const [sort, setSort] = useState<SortKey>(initialSort);

  const totals = useMemo(() => {
    const days = new Set(logs.map((l) => l.log_date));
    return {
      calories: logs.reduce((s, l) => s + (Number(l.calories) || 0), 0),
      protein_g: logs.reduce((s, l) => s + (Number(l.protein_g) || 0), 0),
      carbs_g: logs.reduce((s, l) => s + (Number(l.carbs_g) || 0), 0),
      fat_g: logs.reduce((s, l) => s + (Number(l.fat_g) || 0), 0),
      entries: logs.length,
      days: days.size,
    };
  }, [logs]);

  const sorted = useMemo(() => {
    const rows = [...logs];
    if (sort === "log_date") {
      rows.sort((a, b) => (b.log_date === a.log_date ? b.logged_at.localeCompare(a.logged_at) : b.log_date.localeCompare(a.log_date)));
    } else {
      rows.sort((a, b) => (Number(b[sort]) || 0) - (Number(a[sort]) || 0));
    }
    return rows;
  }, [logs, sort]);

  if (logs.length === 0) {
    return <p className="rounded-2xl border border-hairline bg-surface shadow-card p-5 font-body text-sm text-ink/60">No food logged in this window.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Window totals + averages per logged day */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MACROS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setSort(m.key)}
            aria-pressed={sort === m.key}
            className={`rounded-xl border p-3 text-left transition-colors ${sort === m.key ? "border-red bg-surface shadow-card" : "border-hairline bg-surface hover:border-ink"}`}
          >
            <p className="font-label text-[12px] uppercase tracking-wide text-ink/55">{m.label}</p>
            <p className="mt-0.5 font-display text-2xl text-ink">
              {Math.round(totals[m.key]).toLocaleString()}<span className="text-base text-ink/50">{m.unit}</span>
            </p>
            <p className="font-body text-[12px] text-ink/45">
              ~{totals.days ? Math.round(totals[m.key] / totals.days) : 0}{m.unit}/day
            </p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-body text-sm text-ink/55">{totals.entries} entries · {totals.days} days logged</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sort by">
          <SortChip active={sort === "log_date"} onClick={() => setSort("log_date")}>Newest</SortChip>
          {MACROS.map((m) => (
            <SortChip key={m.key} active={sort === m.key} onClick={() => setSort(m.key)}>{m.label}</SortChip>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface shadow-card">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline">
              <th className="px-3 py-2 font-label text-[12px] uppercase tracking-wide text-ink/50">Date</th>
              <th className="px-3 py-2 font-label text-[12px] uppercase tracking-wide text-ink/50">Food</th>
              {MACROS.map((m) => (
                <th key={m.key} className={`px-3 py-2 text-right font-label text-[12px] uppercase tracking-wide ${sort === m.key ? "text-red" : "text-ink/50"}`}>
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((l) => (
              <tr key={l.id} className="border-b border-hairline last:border-0">
                <td className="whitespace-nowrap px-3 py-2 font-body text-sm text-ink/60">{md(l.log_date)}</td>
                <td className="px-3 py-2">
                  <span className="block font-body text-sm text-ink">{l.name}</span>
                  <span className="block font-body text-[12px] text-ink/45">
                    {l.brand ? `${l.brand} · ` : ""}{l.grams ? `${Math.round(Number(l.grams))} g` : "—"}
                  </span>
                </td>
                {MACROS.map((m) => (
                  <td key={m.key} className={`whitespace-nowrap px-3 py-2 text-right font-body text-sm ${sort === m.key ? "font-600 text-ink" : "text-ink/70"}`}>
                    {Math.round(Number(l[m.key]) || 0)}{m.unit}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-tap border px-2.5 py-1 font-label text-[12px] uppercase tracking-wide ${active ? "border-red bg-red text-white" : "border-hairline bg-surface text-ink/60 hover:border-ink"}`}
    >
      {children}
    </button>
  );
}
