"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STRICTNESS_OPTIONS } from "@/lib/nutrition/strictness";
import { GOAL_OPTIONS } from "@/lib/nutrition/types";
import { balanceMacros, macroPercents, ratioOf, type MacroField } from "@/lib/nutrition/macros";
import {
  coachSetTargetsAction,
  coachSetGoalAction,
  coachRecalcTargetsAction,
  coachAddHabitAction,
  coachSetStrictnessAction,
  coachArchiveHabitAction,
  type PlanState,
} from "@/lib/coach/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { Goal, Habit, HabitCadence, HabitType } from "@/lib/types/db";

const initial: PlanState = {};
const selectClass =
  "min-h-tap w-full rounded-2xl border border-hairline bg-surface shadow-card px-3 py-2.5 font-body text-base text-ink focus:border-ink";
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
  goal,
}: {
  clientId: string;
  targets: Targets | null;
  habits: Habit[];
  strictness: string;
  goal: Goal;
}) {
  const router = useRouter();
  const setTargets = coachSetTargetsAction.bind(null, clientId);
  const setGoal = coachSetGoalAction.bind(null, clientId);
  const addHabit = coachAddHabitAction.bind(null, clientId);
  const setStrictness = coachSetStrictnessAction.bind(null, clientId);
  const [tState, tAction, tPending] = useActionState(setTargets, initial);
  const [gState, gAction, gPending] = useActionState(setGoal, initial);
  const [hState, hAction, hPending] = useActionState(addHabit, initial);
  const [sState, sAction, sPending] = useActionState(setStrictness, initial);
  const [type, setType] = useState<HabitType>("checkbox");
  const [cadence, setCadence] = useState<HabitCadence>("daily");

  // Live macro calculator: change calories → macros scale; change a macro →
  // calories recompute. Controlled so the submitted values are the balanced ones.
  const initialMacros = {
    calories: targets?.calories ?? 2000,
    proteinG: targets?.protein_g ?? 150,
    carbsG: targets?.carbs_g ?? 200,
    fatG: targets?.fat_g ?? 60,
  };
  const [macros, setMacros] = useState(initialMacros);
  // Stable macro split, updated only when a macro is edited — so editing
  // calories digit-by-digit recomputes from it instead of collapsing to zero.
  const ratio = useRef(ratioOf(initialMacros));
  const onMacro = (field: MacroField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(0, Math.round(Number(e.target.value) || 0));
    setMacros((m) => {
      const next = balanceMacros({ ...m, [field]: v }, field, ratio.current);
      if (field !== "calories") ratio.current = ratioOf(next);
      return next;
    });
  };
  const pct = macroPercents(macros);

  const [recalcPending, startRecalc] = useTransition();
  const [recalcMsg, setRecalcMsg] = useState<string | null>(null);
  function autoGenerate() {
    setRecalcMsg(null);
    startRecalc(async () => {
      const res = await coachRecalcTargetsAction(clientId);
      if (res.error) setRecalcMsg(res.error);
      else {
        setRecalcMsg("Recalculated from their profile.");
        router.refresh();
      }
    });
  }

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-hairline bg-surface-muted shadow-card p-5">
      <div>
        <h2 className="text-2xl text-ink">Coach tools</h2>
        <p className="mt-1 font-body text-sm text-ink/60">
          Changes you make here apply to this client right away.
        </p>
      </div>

      {/* Goal */}
      <form action={gAction} className="flex flex-col gap-3" noValidate>
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Goal</p>
        {gState.error ? (
          <p role="alert" className="rounded-lg border border-red bg-surface px-3 py-2 text-sm text-red-ink">{gState.error}</p>
        ) : null}
        {gState.ok ? (
          <p role="status" className="rounded-lg border border-success bg-surface px-3 py-2 text-sm text-success">Goal changed — targets recalculated.</p>
        ) : null}
        <select name="goal" defaultValue={goal} className={selectClass}>
          {GOAL_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>{g.label} — {g.help}</option>
          ))}
        </select>
        <Button type="submit" disabled={gPending}>{gPending ? "Saving…" : "Change goal & recalc targets"}</Button>
      </form>

      <hr className="border-hairline" />

      {/* Adjust targets — live macro calculator */}
      <form action={tAction} className="flex flex-col gap-4" noValidate>
        <div className="flex items-center justify-between gap-3">
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Adjust targets</p>
          <button
            type="button"
            onClick={autoGenerate}
            disabled={recalcPending}
            className="min-h-tap font-label text-[10px] uppercase tracking-wide text-red underline underline-offset-4 hover:text-red-ink disabled:opacity-50"
          >
            {recalcPending ? "Recalculating…" : "Auto-generate (PN)"}
          </button>
        </div>
        {tState.error ? (
          <p role="alert" className="rounded-lg border border-red bg-surface px-3 py-2 text-sm text-red-ink">
            {tState.error}
          </p>
        ) : null}
        {tState.ok ? (
          <p role="status" className="rounded-lg border border-success bg-surface px-3 py-2 text-sm text-success">
            Targets updated.
          </p>
        ) : null}
        {recalcMsg ? (
          <p role="status" className="rounded-2xl border border-hairline bg-surface shadow-card px-3 py-2 text-sm text-ink/70">{recalcMsg}</p>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Calories" name="calories" type="number" inputMode="numeric" min={0} value={macros.calories} onChange={onMacro("calories")} required />
          <Field label="Protein (g)" name="protein_g" type="number" inputMode="numeric" min={0} value={macros.proteinG} onChange={onMacro("proteinG")} />
          <Field label="Carbs (g)" name="carbs_g" type="number" inputMode="numeric" min={0} value={macros.carbsG} onChange={onMacro("carbsG")} />
          <Field label="Fat (g)" name="fat_g" type="number" inputMode="numeric" min={0} value={macros.fatG} onChange={onMacro("fatG")} />
        </div>
        <p className="rounded-2xl border border-hairline bg-surface shadow-card px-3 py-2 font-label text-[11px] uppercase tracking-wide text-ink/70">
          = {macros.calories.toLocaleString()} kcal · {pct.protein}% P / {pct.carbs}% C / {pct.fat}% F
        </p>
        <Button type="submit" disabled={tPending}>
          {tPending ? "Saving…" : "Save targets"}
        </Button>
      </form>

      <hr className="border-hairline" />

      {/* Nutrition strictness (§B) */}
      <form action={sAction} className="flex flex-col gap-3" noValidate>
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Nutrition strictness</p>
        {sState.error ? (
          <p role="alert" className="rounded-lg border border-red bg-surface px-3 py-2 text-sm text-red-ink">{sState.error}</p>
        ) : null}
        {sState.ok ? (
          <p role="status" className="rounded-lg border border-success bg-surface px-3 py-2 text-sm text-success">Strictness saved.</p>
        ) : null}
        <select
          name="strictness"
          defaultValue={strictness}
          className="min-h-tap rounded-2xl border border-hairline bg-surface-muted shadow-card px-3 py-2 font-body text-base text-ink focus:border-red focus:outline-none"
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
          <p role="alert" className="rounded-lg border border-red bg-surface px-3 py-2 text-sm text-red-ink">
            {hState.error}
          </p>
        ) : null}
        {hState.ok ? (
          <p role="status" className="rounded-lg border border-success bg-surface px-3 py-2 text-sm text-success">
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
            <ul className="flex flex-col divide-y divide-hairline rounded-2xl border border-hairline bg-surface shadow-card">
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
