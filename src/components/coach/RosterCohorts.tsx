"use client";

import { useState } from "react";
import {
  segmentRoster,
  COHORT_DIMENSIONS,
  type CohortClient,
  type CohortDimension,
} from "@/lib/coach/cohorts";

/**
 * Coach-facing cohort slicer (§9). Pick a dimension; see per-segment size,
 * activity, flags, and average weight / body-fat. Pure client-side over the
 * already-loaded roster — no round-trip to switch dimensions.
 */
export function RosterCohorts({ clients }: { clients: CohortClient[] }) {
  const [dim, setDim] = useState<CohortDimension>("goal");
  const segments = segmentRoster(clients, dim);

  return (
    <section className="border border-hairline bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Segment by</p>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Segment roster by">
          {COHORT_DIMENSIONS.map((d) => (
            <button
              key={d.key}
              type="button"
              role="tab"
              aria-selected={dim === d.key}
              onClick={() => setDim(d.key)}
              className={`min-h-tap border px-3 font-label text-[11px] uppercase tracking-wide transition-colors ${
                dim === d.key
                  ? "border-red bg-red text-surface"
                  : "border-hairline bg-surface text-ink/70 hover:border-ink"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {segments.length === 0 ? (
        <p className="mt-3 font-body text-sm text-ink/50">
          No clients have that detail set yet.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse font-body text-sm">
            <thead>
              <tr className="text-left font-label text-[10px] uppercase tracking-wide text-ink/50">
                <th className="py-2 pr-3">Segment</th>
                <th className="py-2 pr-3 text-right">Clients</th>
                <th className="py-2 pr-3 text-right">Active today</th>
                <th className="py-2 pr-3 text-right">Need attention</th>
                <th className="py-2 pr-3 text-right">Avg weight</th>
                <th className="py-2 text-right">Avg body fat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {segments.map((s) => (
                <tr key={s.key} className="text-ink/80">
                  <td className="py-2 pr-3 font-body text-ink">{s.label}</td>
                  <td className="py-2 pr-3 text-right">{s.count}</td>
                  <td className="py-2 pr-3 text-right">{s.activeToday}</td>
                  <td className={`py-2 pr-3 text-right ${s.flagged > 0 ? "text-red" : ""}`}>{s.flagged}</td>
                  <td className="py-2 pr-3 text-right">{s.avgWeightLb == null ? "—" : `${s.avgWeightLb} lb`}</td>
                  <td className="py-2 text-right">{s.avgBodyFatPct == null ? "—" : `${s.avgBodyFatPct}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
