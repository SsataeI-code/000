import type { FoodLog } from "@/lib/types/db";
import { formatMicro, presentMicros, sumMicros } from "@/lib/nutrition/micros";

/**
 * Daily micronutrient summary (§5B). Shows the core micros we have data for
 * today (fiber, sugars, sat fat, sodium, potassium, calcium, iron). The full
 * raw nutriment map is stored on each log, so the coach can slice any nutrient
 * later (Phase 3). Hidden entirely when nothing's logged yet.
 */
export function MicroSummary({ logs }: { logs: FoodLog[] }) {
  const totals = sumMicros(logs);
  const rows = presentMicros(totals);
  if (rows.length === 0) return null;

  return (
    <section aria-label="Micronutrients today" className="border border-hairline bg-surface p-5">
      <p className="font-label text-xs uppercase tracking-wide text-ink/50">Micronutrients</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {rows.map(({ def, value }) => (
          <div key={def.key} className="flex items-baseline justify-between border-b border-hairline pb-1">
            <dt className="font-body text-sm text-ink/70">{def.label}</dt>
            <dd className="font-body text-sm font-500 text-ink">{formatMicro(def, value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
