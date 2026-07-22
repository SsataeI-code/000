import type { ReactNode } from "react";
import type { RosterSeries } from "@/lib/coach/data";
import { seriesMean } from "@/lib/charts/series";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";

export interface WeightSplit {
  losing: number;
  holding: number;
  gaining: number;
  tracked: number;
}

/**
 * Roster-wide graphs (§9 "roster-wide aggregates"). The whole book of clients at
 * a glance: how many log each day, average calories and protein, average habit
 * engagement, and which way the roster's weight is moving.
 */
export function RosterTrends({
  series,
  days,
  weightSplit,
  toggle,
}: {
  series: RosterSeries;
  days: number;
  weightSplit: WeightSplit;
  toggle?: ReactNode;
}) {
  const avgLogging = seriesMean(series.loggingRate);
  const avgCons = seriesMean(series.avgConsistency);
  const avgCal = seriesMean(series.avgCalories);
  const avgPro = seriesMean(series.avgProtein);

  return (
    <section className="flex flex-col gap-5 border border-hairline bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-2xl text-ink">Roster trends</h2>
        <div className="flex items-center gap-3">
          <p className="hidden font-body text-xs text-ink/50 sm:block">last {days}d · {series.clientCount} clients</p>
          {toggle}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Avg logging" value={avgLogging == null ? "—" : `${Math.round(avgLogging * 100)}%`} />
        <MiniStat label="Avg calories" value={avgCal == null ? "—" : String(Math.round(avgCal))} />
        <MiniStat label="Avg protein" value={avgPro == null ? "—" : `${Math.round(avgPro)} g`} />
        <MiniStat label="Avg consistency" value={avgCons == null ? "—" : `${Math.round(avgCons * 100)}%`} />
      </div>

      {/* Weight direction of the roster (recent trend) */}
      <div className="border border-hairline bg-surface-muted p-4">
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Weight trend (recent)</p>
        {weightSplit.tracked === 0 ? (
          <p className="mt-2 font-body text-sm text-ink/50">No weight trends logged yet.</p>
        ) : (
          <>
            <div className="mt-2 flex h-3 overflow-hidden border border-hairline" role="img"
              aria-label={`${weightSplit.losing} losing, ${weightSplit.holding} holding, ${weightSplit.gaining} gaining`}>
              <span className="bg-success" style={{ width: `${(weightSplit.losing / weightSplit.tracked) * 100}%` }} />
              <span className="bg-ink/30" style={{ width: `${(weightSplit.holding / weightSplit.tracked) * 100}%` }} />
              <span className="bg-red" style={{ width: `${(weightSplit.gaining / weightSplit.tracked) * 100}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-ink/60">
              <span><span className="text-success">●</span> {weightSplit.losing} losing</span>
              <span><span className="text-ink/40">●</span> {weightSplit.holding} holding</span>
              <span><span className="text-red">●</span> {weightSplit.gaining} gaining</span>
            </div>
          </>
        )}
      </div>

      <div>
        <p className="mb-2 font-label text-xs uppercase tracking-wide text-ink/50">Clients logging food / day</p>
        <BarChart
          points={series.loggingRate.map((p) => ({ ...p, value: p.value == null ? null : p.value * 100 }))}
          max={100}
          ariaLabel="Percent of clients who logged food each day"
          formatValue={(n) => `${Math.round(n)}%`}
        />
      </div>

      <div>
        <p className="mb-2 font-label text-xs uppercase tracking-wide text-ink/50">Avg calories logged / day</p>
        <LineChart
          points={series.avgCalories}
          ariaLabel="Average calories logged across the roster each day"
          formatValue={(n) => `${Math.round(n)}`}
        />
      </div>

      <div>
        <p className="mb-2 font-label text-xs uppercase tracking-wide text-ink/50">Avg protein logged / day</p>
        <LineChart
          points={series.avgProtein}
          color="#1f8a4c"
          ariaLabel="Average protein logged across the roster each day"
          formatValue={(n) => `${Math.round(n)} g`}
        />
      </div>

      <div>
        <p className="mb-2 font-label text-xs uppercase tracking-wide text-ink/50">Avg habit engagement / day</p>
        <BarChart
          points={series.avgConsistency.map((p) => ({ ...p, value: p.value == null ? null : p.value * 100 }))}
          max={100}
          color="#1f8a4c"
          overColor="#1f8a4c"
          ariaLabel="Average share of clients engaging their habits each day"
          formatValue={(n) => `${Math.round(n)}%`}
        />
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-hairline bg-surface-muted p-3 text-center">
      <p className="font-display text-2xl text-ink">{value}</p>
      <p className="font-label text-[10px] uppercase tracking-wide text-ink/50">{label}</p>
    </div>
  );
}
