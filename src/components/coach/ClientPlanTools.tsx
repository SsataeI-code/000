"use client";

import { useActionState } from "react";
import {
  coachSetTargetsAction,
  coachAddHabitAction,
  coachArchiveHabitAction,
  type PlanState,
} from "@/lib/coach/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { Habit } from "@/lib/types/db";

const initial: PlanState = {};
const selectClass =
  "min-h-tap w-full border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink focus:border-ink";

interface Targets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/**
 * Coach-side plan controls on the deep-dive (§9 "editing their goals", §5A
 * "coach can add/veto habits"). Adjust targets, assign a habit, veto a habit —
 * every write authorized server-side to this coach's own client.
 */
export function ClientPlanTools({
  clientId,
  targets,
  habits,
}: {
  clientId: string;
  targets: Targets | null;
  habits: Habit[];
}) {
  const setTargets = coachSetTargetsAction.bind(null, clientId);
  const addHabit = coachAddHabitAction.bind(null, clientId);
  const [tState, tAction, tPending] = useActionState(setTargets, initial);
  const [hState, hAction, hPending] = useActionState(addHabit, initial);

  return (
    <section className="flex flex-col gap-6 border border-hairline bg-surface-muted p-5">
      <div>
        <h2 className="text-2xl text-ink">Coach tools</h2>
        <p className="mt-1 font-body text-sm text-ink/60">
          Changes you make here apply to this client right away.
        </p>
      </div>

      {/* Adjust targets */}
      <form action={tAction} className="flex flex-col gap-4" noValidate>
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Adjust targets</p>
        {tState.error ? (
          <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">
            {tState.error}
          </p>
        ) : null}
        {tState.ok ? (
          <p role="status" className="border border-success bg-surface px-3 py-2 text-sm text-success">
            Targets updated.
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Calories" name="calories" type="number" inputMode="numeric" min={0} defaultValue={targets?.calories ?? ""} required />
          <Field label="Protein (g)" name="protein_g" type="number" inputMode="numeric" min={0} defaultValue={targets?.protein_g ?? ""} />
          <Field label="Carbs (g)" name="carbs_g" type="number" inputMode="numeric" min={0} defaultValue={targets?.carbs_g ?? ""} />
          <Field label="Fat (g)" name="fat_g" type="number" inputMode="numeric" min={0} defaultValue={targets?.fat_g ?? ""} />
        </div>
        <Button type="submit" disabled={tPending}>
          {tPending ? "Saving…" : "Save targets"}
        </Button>
      </form>

      <hr className="border-hairline" />

      {/* Assign a habit */}
      <form action={hAction} className="flex flex-col gap-4" noValidate>
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Assign a daily habit</p>
        {hState.error ? (
          <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">
            {hState.error}
          </p>
        ) : null}
        {hState.ok ? (
          <p role="status" className="border border-success bg-surface px-3 py-2 text-sm text-success">
            Habit assigned.
          </p>
        ) : null}
        <Field label="Habit name" name="name" placeholder="e.g. 10-min evening walk" required />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-xs text-ink/80">Category</label>
          <select id="category" name="category" defaultValue="movement" className={selectClass}>
            <option value="movement">Movement</option>
            <option value="nutrition">Nutrition</option>
            <option value="sleep">Sleep</option>
            <option value="mindfulness">Mindfulness</option>
            <option value="hydration">Hydration</option>
            <option value="recovery">Recovery</option>
          </select>
        </div>
        <Button type="submit" disabled={hPending}>
          {hPending ? "Adding…" : "Assign habit"}
        </Button>
      </form>

      {/* Veto (archive) habits */}
      {habits.length > 0 ? (
        <>
          <hr className="border-hairline" />
          <div className="flex flex-col gap-2">
            <p className="font-label text-xs uppercase tracking-wide text-ink/50">Remove a habit</p>
            <ul className="flex flex-col divide-y divide-hairline border border-hairline bg-surface">
              {habits.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0 truncate font-body text-sm text-ink">{h.name}</span>
                  <form action={coachArchiveHabitAction.bind(null, h.id, clientId)}>
                    <button
                      type="submit"
                      className="min-h-tap shrink-0 font-label text-[10px] uppercase tracking-wide text-red underline underline-offset-4 hover:text-red-ink"
                    >
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </section>
  );
}
