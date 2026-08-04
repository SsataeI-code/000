"use client";

import { useActionState, useState } from "react";
import { STRICTNESS_OPTIONS } from "@/lib/nutrition/strictness";
import {
  coachSetTargetsAction,
  coachAddHabitAction,
  coachSetStrictnessAction,
  coachArchiveHabitAction,
  type PlanState,
} from "@/lib/coach/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { Habit, HabitCadence, HabitType } from "@/lib/types/db";

const initial: PlanState = {};
const selectClass =
  "min-h-tap w-full border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink focus:border-ink";
const labelClass = "text-xs text-ink/80";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  strictness,
}: {
  clientId: string;
  targets: Targets | null;
  habits: Habit[];
  strictness: string;
}) {
  const setTargets = coachSetTargetsAction.bind(null, clientId);
  const addHabit = coachAddHabitAction.bind(null, clientId);
  const setStrictness = coachSetStrictnessAction.bind(null, clientId);
  const [tState, tAction, tPending] = useActionState(setTargets, initial);
  const [hState, hAction, hPending] = useActionState(addHabit, initial);
  const [sState, sAction, sPending] = useActionState(setStrictness, initial);
  const [type, setType] = useState<HabitType>("checkbox");
  const [cadence, setCadence] = useState<HabitCadence>("daily");

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

      {/* Nutrition strictness (§B) */}
      <form action={sAction} className="flex flex-col gap-3" noValidate>
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Nutrition strictness</p>
        {sState.error ? (
          <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">{sState.error}</p>
        ) : null}
        {sState.ok ? (
          <p role="status" className="border border-success bg-surface px-3 py-2 text-sm text-success">Strictness saved.</p>
        ) : null}
        <select
          name="strictness"
          defaultValue={strictness}
          className="min-h-tap border border-hairline bg-surface-muted px-3 py-2 font-body text-base text-ink focus:border-red focus:outline-none"
        >
          {STRICTNESS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} — {o.help}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={sPending}>
          {sPending ? "Saving…" : "Save strictness"}
        </Button>
      </form>

      <hr className="border-hairline" />

      {/* Assign a habit — full builder */}
      <form action={hAction} className="flex flex-col gap-4" noValidate>
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Build a habit for this client</p>
        {hState.error ? (
          <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">
            {hState.error}
          </p>
        ) : null}
        {hState.ok ? (
          <p role="status" className="border border-success bg-surface px-3 py-2 text-sm text-success">
            Habit added.
          </p>
        ) : null}
        <Field label="Habit name" name="name" placeholder="e.g. 10-min evening walk" required />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className={labelClass}>Category</label>
          <select id="category" name="category" defaultValue="movement" className={selectClass}>
            <option value="movement">Movement</option>
            <option value="nutrition">Nutrition</option>
            <option value="sleep">Sleep</option>
            <option value="mindfulness">Mindfulness</option>
            <option value="hydration">Hydration</option>
            <option value="recovery">Recovery</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="type" className={labelClass}>How do they track it?</label>
          <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value as HabitType)} className={selectClass}>
            <option value="checkbox">Just check it off</option>
            <option value="counter">Count toward a target</option>
            <option value="duration">Minutes</option>
            <option value="quantity">A quantity</option>
          </select>
        </div>

        {type !== "checkbox" ? (
          <div className="flex gap-3">
            <div className="flex-1"><Field label="Target" name="target" type="number" inputMode="numeric" placeholder="e.g. 8000" /></div>
            <div className="flex-1"><Field label="Unit" name="unit" placeholder="steps, min…" /></div>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cadence" className={labelClass}>How often?</label>
          <select id="cadence" name="cadence" value={cadence} onChange={(e) => setCadence(e.target.value as HabitCadence)} className={selectClass}>
            <option value="daily">Every day</option>
            <option value="weekly_count">A number of times per week</option>
            <option value="specific_days">Specific days</option>
          </select>
        </div>

        {cadence === "weekly_count" ? (
          <Field label="Times per week" name="times_per_week" type="number" inputMode="numeric" min={1} max={7} defaultValue={3} />
        ) : null}

        {cadence === "specific_days" ? (
          <fieldset className="flex flex-col gap-1.5">
            <legend className={labelClass}>Which days?</legend>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d, i) => (
                <label key={d} className="flex min-h-tap cursor-pointer items-center gap-1.5 border border-hairline px-3 font-body text-sm">
                  <input type="checkbox" name="days_of_week" value={i} className="h-4 w-4 accent-red" />
                  {d}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <Field label="Reminder time (optional)" name="reminder_time" type="time" />
        <Field label="Stack it onto a routine (optional)" name="anchor" placeholder="e.g. after morning coffee" />
        <Field label="Why (optional, shown at check-in)" name="why" placeholder="e.g. more energy for the day" />

        <Button type="submit" disabled={hPending}>
          {hPending ? "Adding…" : "Add habit"}
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
