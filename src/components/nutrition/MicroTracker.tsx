import type { FoodLog, Sex } from "@/lib/types/db";
import { buildMicroGoals, sumMicros, type MicroGoalRow, type MicroGroup } from "@/lib/nutrition/micros";

/**
 * Essential vitamin + mineral tracker with goals (§5B). Goals are the FDA 2,000-
 * calorie Daily Values (vitamins/minerals fixed, so a low-calorie client still
 * targets the full amount); fiber and the sat-fat/sugar caps scale to the
 * client's own calories. Collapsed by default so the "Today" screen stays light.
 * Consumed shows 0 where we don't yet have food data for a nutrient.
 */
export function MicroTracker({
  logs,
  calories,
  sex,
}: {
  logs: FoodLog[];
  calories: number;
  sex: Sex | null;
}) {
  const totals = sumMicros(logs);
  const rows = buildMicroGoals(totals, calories, sex);
  const groups: MicroGroup[] = ["Vitamins", "Minerals", "Limits", "Also tracked"];
  // "Also tracked" nutrients (no Daily Value) only appear once there's data —
  // no clutter of empty rows for things most foods don't report.
  const hasRows = (g: MicroGroup) =>
    rows.some((r) => r.def.group === g && (g !== "Also tracked" || r.consumed > 0));

  return (
    <details className="border border-hairline bg-surface">
      <summary className="flex min-h-tap cursor-pointer list-none items-center justify-between px-5 py-3">
        <span className="font-label text-xs uppercase tracking-wide text-ink/70">
          Vitamins &amp; minerals
        </span>
        <span className="font-label text-[10px] uppercase tracking-wide text-ink/40">
          Goals · tap to expand
        </span>
      </summary>

      <div className="flex flex-col gap-5 px-5 pb-5">
        {groups.filter(hasRows).map((g) => (
          <div key={g}>
            <p className="mb-2 font-label text-[10px] uppercase tracking-wide text-ink/50">{g}</p>
            <div className="flex flex-col gap-2.5">
              {rows
                .filter((r) => r.def.group === g && (g !== "Also tracked" || r.consumed > 0))
                .map((r) => (
                  <MicroRow key={r.def.key} row={r} />
                ))}
            </div>
          </div>
        ))}
        <p className="font-body text-xs text-ink/40">
          Goals use the standard 2,000-calorie Daily Values. A nutrient reads 0
          until you log foods we have data for — scanning products fills it in.
        </p>
      </div>
    </details>
  );
}

function fmt(value: number, unit: string): string {
  if (unit === "mcg") return String(Math.round(value));
  if (unit === "g") return value.toFixed(1);
  return value < 10 ? value.toFixed(1) : String(Math.round(value)); // mg
}

function MicroRow({ row }: { row: MicroGoalRow }) {
  const { def, goal, consumed, kind } = row;

  // Tracked-only (no Daily Value): show the amount, no goal bar.
  if (kind === "info") {
    return (
      <div className="flex items-baseline justify-between">
        <span className="font-body text-sm text-ink/80">{def.label}</span>
        <span className="font-body text-xs text-ink/60">{fmt(consumed, def.unit)} {def.unit}</span>
      </div>
    );
  }

  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const over = goal > 0 && consumed > goal;
  // Limits: over the cap is bad (red). Goals: over/at is good; under is neutral.
  const barColor = kind === "limit" ? (over ? "#e10600" : "#f4f4f2") : "#34c759";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="font-body text-sm text-ink/80">{def.label}</span>
        <span className={`font-body text-xs ${over && kind === "limit" ? "text-red" : "text-ink/60"}`}>
          {fmt(consumed, def.unit)} / {kind === "limit" ? "≤" : ""}
          {fmt(goal, def.unit)} {def.unit}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden bg-hairline">
        <div className="h-full" style={{ width: `${pct * 100}%`, background: barColor }} />
      </div>
    </div>
  );
}
