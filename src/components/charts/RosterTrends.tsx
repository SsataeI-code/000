import type { ReactNode } from "react";
import type { RosterSeries } from "@/lib/coach/data";
import { seriesMean, type SeriesPoint } from "@/lib/charts/series";
import { LineChart } from "@/components/charts/LineChart";

export interface WeightSplit {
  losing: number;
  holding: number;
  gaining: number;
  tracked: number;
}

/**
 * Roster-wide trends (§9). Built around what a coach steers by: are clients
 * showing up (logging + habits), and which way is their weight moving. Every
 * chart plots day-by-day data points — never combined — with the range toggle
 * choosing the window. The raw roster-average calories/protein are kept as small
 * context stats, not headline charts (a coach acts per client, not on a
 * book-wide calorie mean).
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
  const pct = (s: SeriesPoint[]): SeriesPoint[] => s.map((p) => ({ ...p, value: p.value == null ? null : p.value * 100 }));
  const loggingPct = pct(series.loggingRate);
  const consPct = pct(series.avgConsistency);

  const avgLogging = seriesMean(series.loggingRate);
  const avgCons = seriesMean(series.avgConsistency);
  const avgCal = seriesMean(series.avgCalories);
  const avgPro = seriesMean(series.avgProtein);

  const ws = weightSplit;
  const wpct = (n: number) => (ws.tracked > 0 ? (n / ws.tracked) * 100 : 0);

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-hairline bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-2xl text-ink">Roster trends</h2>
        <div className="flex items-center gap-2">
          <p className="hidden font-body text-xs text-ink/50 sm:block">last {days}d · {series.clientCount} clients</p>
          {toggle}
        </div>
      </div>

      {/* Weight direction — the headline for a roster (who's moving right) */}
      <div className="rounded-lg border border-hairline bg-surface-muted p-4">
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Weight direction</p>
        {ws.tracked === 0 ? (
          <p className="mt-2 font-body text-sm text-ink/50">No weight trends logged yet.</p>
        ) : (
          <>
            <div className="mt-2 flex h-4 overflow-hidden rounded-sm border border-hairline" role="img"
              aria-label={`${ws.losing} trending down, ${ws.holding} holding, ${ws.gaining} trending up of ${ws.tracked} tracked`}>
              <span className="bg-success" style={{ width: `${wpct(ws.losing)}%` }} />
              <span className="bg-hairline" style={{ width: `${wpct(ws.holding)}%` }} />
              <span className="bg-red" style={{ width: `${wpct(ws.gaining)}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-ink/70">
              <span><span className="text-success">▼</span> {ws.losing} trending down</span>
              <span><span className="text-ink/40">■</span> {ws.holding} holding</span>
              <span><span className="text-red">▲</span> {ws.gaining} trending up</span>
              <span className="text-ink/40">of {ws.tracked} tracking weight</span>
            </div>
          </>
        )}
      </div>

      {/* Snapshot */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Logged (avg/day)" value={avgLogging == null ? "—" : `${Math.round(avgLogging * 100)}%`} sub="of clients" />
        <MiniStat label="Habits (avg/day)" value={avgCons == null ? "—" : `${Math.round(avgCons * 100)}%`} sub="engagement" />
        <MiniStat label="Avg calories" value={avgCal == null ? "—" : String(Math.round(avgCal))} sub="on logged days" />
        <MiniStat label="Avg protein" value={avgPro == null ? "—" : `${Math.round(avgPro)} g`} sub="on logged days" />
      </div>

      {/* Engagement — the momentum a coach reads */}
      <div>
        <p className="mb-2 font-label text-xs uppercase tracking-wide text-ink/50">Clients logging food / day</p>
        <LineChart points={loggingPct} targetLine={100} targetLabel="all" ariaLabel="Percent of clients who logged food each day" formatValue={(n) => `${Math.round(n)}%`} />
      </div>

      <div>
        <p className="mb-2 font-label text-xs uppercase tracking-wide text-ink/50">Habit engagement / day</p>
        <LineChart points={consPct} color="#34c759" targetLine={100} targetLabel="goal" ariaLabel="Average share of clients engaging their habits each day" formatValue={(n) => `${Math.round(n)}%`} />
      </div>
    </section>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface-muted p-3 text-center">
      <p className="font-display text-2xl text-ink">{value}</p>
      <p className="font-label text-[10px] uppercase tracking-wide text-ink/50">{label}</p>
      {sub ? <p className="font-body text-[10px] text-ink/40">{sub}</p> : null}
    </div>
  );
}
