"use client";

import { useActionState, useState } from "react";
import { createHabitAction, type HabitFormState } from "@/lib/habits/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { HabitCadence, HabitType } from "@/lib/types/db";

const initial: HabitFormState = {};
const selectClass = "min-h-tap w-full border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink focus:border-ink";
const labelClass = "text-xs text-ink/80";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HabitBuilderForm() {
  const [state, formAction, pending] = useActionState(createHabitAction, initial);
  const [type, setType] = useState<HabitType>("checkbox");
  const [cadence, setCadence] = useState<HabitCadence>("daily");

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.error ? (
        <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">
          {state.error}
        </p>
      ) : null}

      <Field label="Habit name" name="name" placeholder="e.g. 30-min walk" required />

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
        <label htmlFor="type" className={labelClass}>How do you track it?</label>
        <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value as HabitType)} className={selectClass}>
          <option value="checkbox">Just check it off</option>
          <option value="counter">Count toward a target</option>
          <option value="duration">Minutes</option>
          <option value="quantity">A quantity</option>
        </select>
      </div>

      {type !== "checkbox" ? (
        <div className="flex gap-3">
          <div className="flex-1">
            <Field label="Target" name="target" type="number" inputMode="numeric" placeholder="e.g. 8000" />
          </div>
          <div className="flex-1">
            <Field label="Unit" name="unit" placeholder="steps, min…" />
          </div>
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
      <Field label="Your why (optional, shown at check-in)" name="why" placeholder="e.g. more energy for the kids" />

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create habit"}
      </Button>
    </form>
  );
}
