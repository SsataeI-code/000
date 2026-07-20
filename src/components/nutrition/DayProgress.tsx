"use client";

import { Ring } from "@/components/nutrition/Ring";
import { MacroBar } from "@/components/nutrition/MacroBar";
import type { Macros } from "@/lib/nutrition/types";

export interface Targets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** A warm, forgiving line about where the day stands (§4 voice, §5). */
function encouragement(totals: Macros, targets: Targets): string {
  if (totals.calories === 0) return "Fresh start. Log your first thing when you're ready.";
  const remaining = targets.calories - totals.calories;
  const proteinLeft = targets.proteinG - totals.proteinG;
  if (remaining < -150) return "A bit over today — no big deal. Tomorrow's a clean page.";
  if (proteinLeft > 25) return `${Math.round(proteinLeft)}g of protein to go — you've got room for it.`;
  if (remaining > 200) return `${Math.round(remaining)} calories left. Nicely on track.`;
  return "Right in the pocket. Great day.";
}

export function DayProgress({ totals, targets }: { totals: Macros; targets: Targets }) {
  return (
    <section aria-label="Today's progress" className="flex flex-col items-center gap-6 border border-hairline bg-surface p-6">
      <Ring value={totals.calories} target={targets.calories} label="Calories" unit="kcal" />

      <div className="grid w-full max-w-sm grid-cols-1 gap-3">
        <MacroBar label="Protein" value={totals.proteinG} target={targets.proteinG} />
        <MacroBar label="Carbs" value={totals.carbsG} target={targets.carbsG} />
        <MacroBar label="Fat" value={totals.fatG} target={targets.fatG} />
      </div>

      <p className="text-center font-body text-sm text-ink/70">{encouragement(totals, targets)}</p>
    </section>
  );
}
