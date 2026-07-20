"use client";

import { useActionState, useState } from "react";
import { logMeasurementAction, type MeasurementState } from "@/lib/body/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initial: MeasurementState = {};

/** Log weight (+ optional body-fat % and measurements). Measurements are a
 *  secondary add-on (§5C) — present for those who want them, never front-and-center. */
export function BodyLogForm() {
  const [state, formAction, pending] = useActionState(logMeasurementAction, initial);
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [showMore, setShowMore] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.error ? (
        <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="border border-hairline bg-surface px-3 py-2 text-sm text-success">
          Saved.
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink/80">Weight</span>
          <div className="flex border border-hairline" role="group" aria-label="Units">
            {(["lb", "kg"] as const).map((u) => (
              <button key={u} type="button" onClick={() => setUnit(u)} aria-pressed={unit === u}
                className={`min-h-tap px-3 font-label text-xs uppercase tracking-wide ${unit === u ? "bg-ink text-surface" : "bg-surface text-ink/60"}`}>
                {u}
              </button>
            ))}
          </div>
        </div>
        <input type="hidden" name="weight_unit" value={unit} />
        <input name="weight" type="number" inputMode="decimal" step="0.1" placeholder={unit}
          aria-label={`Weight in ${unit}`}
          className="min-h-tap w-full border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink focus:border-ink" />
      </div>

      <button type="button" onClick={() => setShowMore((v) => !v)}
        className="min-h-tap self-start font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
        {showMore ? "Fewer fields" : "Add body-fat % / measurements"}
      </button>

      {showMore ? (
        <div className="flex flex-col gap-5">
          <Field label="Body-fat %" name="body_fat_pct" type="number" inputMode="decimal" step="0.1" />
          <div className="flex gap-3">
            <div className="flex-1"><Field label="Waist (cm)" name="waist_cm" type="number" inputMode="decimal" /></div>
            <div className="flex-1"><Field label="Hips (cm)" name="hips_cm" type="number" inputMode="decimal" /></div>
          </div>
        </div>
      ) : null}

      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Log it"}</Button>
    </form>
  );
}
