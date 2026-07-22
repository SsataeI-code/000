import type { RosterSeries } from "@/lib/coach/data";
import { seriesMean } from "@/lib/charts/series";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";

/**
 * Roster-wide graphs (§9 "roster-wide aggregates"). The whole book of clients at
 * a glance: how many log each day, average calories, and average habit
 * engagement — the coach's command-center pulse.
 */
export function RosterTrends({ series, days }: { series: RosterSeries; days: number }) {
  const avgLogging = seriesMean(series.loggingRate);
  const avgCons = seriesMean(series.avgConsistency);
  const avgCal = seriesMean(series.avgCalories);

  return (
    <section className="flex flex-col gap-5 border border-hairline bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-2xl text-ink">Roster trends</h2>
        <p className="font-body text-xs text-ink/50">last {days} days · {series.clientCount} clients</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Avg logging" value={avgLogging == null ? "—" : `${Math.round(avgLogging * 100)}%`} />
        <MiniStat label="Avg calories" value={avgCal == null ? "—" : String(Math.round(avgCal))} />
        <MiniStat label="Avg consistency" value={avgCons == null ? "—" : `${Math.round(avgCons * 100)}%`} />
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
