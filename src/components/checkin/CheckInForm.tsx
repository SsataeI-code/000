"use client";

import { useActionState, useState } from "react";
import { submitCheckinAction, type CheckInState } from "@/lib/checkin/actions";
import type { CheckIn } from "@/lib/types/db";

const initial: CheckInState = {};
const ENERGY = [
  { v: 1, label: "Drained" },
  { v: 2, label: "Low" },
  { v: 3, label: "OK" },
  { v: 4, label: "Good" },
  { v: 5, label: "Great" },
];
const LB_PER_KG = 2.20462;

/**
 * Weekly check-in composer (§ accountability). Morning weight, an energy rating,
 * one win, one thing to work on. Upserts this week's check-in; weight also feeds
 * the body trend. Pre-filled if the client already checked in this week.
 */
export function CheckInForm({ existing }: { existing: CheckIn | null }) {
  const [state, action, pending] = useActionState(submitCheckinAction, initial);
  const [energy, setEnergy] = useState<number | null>(existing?.energy ?? null);
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const existingWeight = existing?.weight_kg != null ? Math.round(existing.weight_kg * LB_PER_KG * 10) / 10 : "";

  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface shadow-card p-5">
      {state.error ? <p role="alert" className="rounded-lg border border-red bg-surface px-3 py-2 text-sm text-red-ink">{state.error}</p> : null}
      {state.ok ? <p role="status" className="rounded-lg border border-success bg-surface px-3 py-2 text-sm text-success">Check-in saved — your coach will see it.</p> : null}

      {/* Weight */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ci_weight" className="text-xs text-ink/80">This week&apos;s weight (morning)</label>
        <div className="flex gap-2">
          <input id="ci_weight" name="weight" type="number" inputMode="decimal" step="0.1" min={0} defaultValue={existingWeight}
            className="min-h-tap flex-1 rounded-lg border border-hairline bg-surface-input px-3.5 py-2.5 font-body text-base text-ink outline-none focus:border-red focus:ring-2 focus:ring-red/30" />
          <select value={unit} onChange={(e) => setUnit(e.target.value as "lb" | "kg")} name="unit"
            className="min-h-tap rounded-lg border border-hairline bg-surface-input px-3 py-2 font-body text-base text-ink focus:border-red focus:outline-none">
            <option value="lb">lb</option>
            <option value="kg">kg</option>
          </select>
        </div>
      </div>

      {/* Energy */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-ink/80">Energy this week</span>
        <input type="hidden" name="energy" value={energy ?? ""} />
        <div className="flex flex-wrap gap-2">
          {ENERGY.map((e) => (
            <button key={e.v} type="button" onClick={() => setEnergy((c) => (c === e.v ? null : e.v))} aria-pressed={energy === e.v}
              className={`min-h-tap rounded-full border px-3.5 py-1.5 font-label text-[11px] font-600 uppercase tracking-wide transition-transform active:scale-95 ${
                energy === e.v ? "border-transparent bg-grad-red text-white shadow-glow" : "border-hairline bg-surface-input text-ink/70 hover:border-red"
              }`}>
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Win + focus */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ci_win" className="text-xs text-ink/80">A win this week</label>
        <textarea id="ci_win" name="win" rows={2} defaultValue={existing?.win ?? ""} placeholder="e.g. Hit my steps every day"
          className="w-full resize-none rounded-lg border border-hairline bg-surface-input px-3.5 py-2.5 font-body text-base text-ink placeholder:text-ink/40 outline-none focus:border-red focus:ring-2 focus:ring-red/30" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ci_focus" className="text-xs text-ink/80">One thing to work on</label>
        <textarea id="ci_focus" name="focus" rows={2} defaultValue={existing?.focus ?? ""} placeholder="e.g. More protein at breakfast"
          className="w-full resize-none rounded-lg border border-hairline bg-surface-input px-3.5 py-2.5 font-body text-base text-ink placeholder:text-ink/40 outline-none focus:border-red focus:ring-2 focus:ring-red/30" />
      </div>

      <button type="submit" disabled={pending}
        className="min-h-tap rounded-xl bg-grad-red px-5 py-3 font-label text-sm font-600 uppercase tracking-wide text-white shadow-pop-red transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-60">
        {pending ? "Saving…" : existing ? "Update check-in" : "Submit check-in"}
      </button>
    </form>
  );
}
