"use client";

import { useActionState } from "react";
import { saveFoodPrefsAction, type FoodPrefsState } from "@/lib/nutrition/actions";
import { DIET_OPTIONS } from "@/lib/food/diet";
import { Button } from "@/components/ui/Button";

const initial: FoodPrefsState = {};
const field = "min-h-tap w-full border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink focus:border-ink";

/** Client edits their diet pattern + avoid list — filters food suggestions live. */
export function FoodPreferences({ pattern, avoid }: { pattern: string; avoid: string }) {
  const [state, action, pending] = useActionState(saveFoodPrefsAction, initial);
  return (
    <section aria-label="Food preferences" className="flex flex-col gap-3 border border-hairline bg-surface p-5">
      <div>
        <h2 className="text-2xl text-ink">Food preferences</h2>
        <p className="mt-1 font-body text-sm text-ink/60">
          Your diet shapes which foods we suggest — and what we keep out. Change it anytime.
        </p>
      </div>
      {state.error ? (
        <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p role="status" className="border border-success bg-surface px-3 py-2 text-sm text-success">Preferences saved.</p>
      ) : null}
      <form action={action} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-ink/80">Diet</span>
          <select name="diet_pattern" defaultValue={pattern} className={field}>
            {DIET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} — {o.help}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-ink/80">Avoid (optional)</span>
          <input name="food_avoid" defaultValue={avoid} placeholder="e.g. shellfish, peanuts, cilantro" className={field} />
        </label>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save preferences"}</Button>
      </form>
    </section>
  );
}
