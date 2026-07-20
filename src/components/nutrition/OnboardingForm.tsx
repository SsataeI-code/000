"use client";

import { useActionState, useState } from "react";
import { saveOnboardingAction, type OnboardingState } from "@/lib/nutrition/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { HABIT_IDEAS, categoryForIdea } from "@/lib/habits/ideas";

const initial: OnboardingState = {};

const selectClass =
  "min-h-tap w-full border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink focus:border-ink";
const labelClass = "text-xs text-ink/80";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(saveOnboardingAction, initial);
  const [heightUnit, setHeightUnit] = useState<"ftin" | "cm">("ftin");
  const [weightUnit, setWeightUnit] = useState<"lb" | "kg">("lb");
  const [ownHabit, setOwnHabit] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.error ? (
        <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sex" className={labelClass}>
          Sex (for the calorie math)
        </label>
        <select id="sex" name="sex" required defaultValue="" className={selectClass}>
          <option value="" disabled>
            Choose…
          </option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
      </div>

      <Field label="Age" name="age" type="number" inputMode="numeric" min={13} max={100} required />

      {/* Height */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className={labelClass}>Height</span>
          <UnitToggle
            value={heightUnit}
            options={[
              ["ftin", "ft/in"],
              ["cm", "cm"],
            ]}
            onChange={(v) => setHeightUnit(v as "ftin" | "cm")}
          />
        </div>
        <input type="hidden" name="height_unit" value={heightUnit} />
        {heightUnit === "ftin" ? (
          <div className="flex gap-3">
            <input
              name="height_ft"
              type="number"
              inputMode="numeric"
              placeholder="ft"
              aria-label="Height feet"
              min={3}
              max={8}
              required
              className={selectClass}
            />
            <input
              name="height_in"
              type="number"
              inputMode="numeric"
              placeholder="in"
              aria-label="Height inches"
              min={0}
              max={11}
              className={selectClass}
            />
          </div>
        ) : (
          <input
            name="height_cm"
            type="number"
            inputMode="numeric"
            placeholder="cm"
            aria-label="Height in centimeters"
            min={90}
            max={250}
            required
            className={selectClass}
          />
        )}
      </div>

      {/* Weight */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className={labelClass}>Current weight</span>
          <UnitToggle
            value={weightUnit}
            options={[
              ["lb", "lb"],
              ["kg", "kg"],
            ]}
            onChange={(v) => setWeightUnit(v as "lb" | "kg")}
          />
        </div>
        <input type="hidden" name="weight_unit" value={weightUnit} />
        <input
          name="weight"
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder={weightUnit}
          aria-label={`Weight in ${weightUnit}`}
          required
          className={selectClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="activity" className={labelClass}>
          How active are you?
        </label>
        <select id="activity" name="activity" required defaultValue="" className={selectClass}>
          <option value="" disabled>
            Choose…
          </option>
          <option value="sedentary">Mostly sitting</option>
          <option value="light">Lightly active (1–2 days/wk)</option>
          <option value="moderate">Moderately active (3–4 days/wk)</option>
          <option value="very">Very active (5–6 days/wk)</option>
          <option value="athlete">Athlete (daily hard training)</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="goal" className={labelClass}>
          Your goal
        </label>
        <select id="goal" name="goal" defaultValue="maintain" className={selectClass}>
          <option value="lose">Lose fat / weight</option>
          <option value="maintain">Maintain</option>
          <option value="recomp">Recomp (lean out, hold weight)</option>
          <option value="gain">Build muscle / gain</option>
          <option value="habits_only">Just build habits</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="diet_preference" className={labelClass}>
          Eating style
        </label>
        <select id="diet_preference" name="diet_preference" defaultValue="balanced" className={selectClass}>
          <option value="balanced">Balanced</option>
          <option value="low_carb">Lower carb</option>
          <option value="low_fat">Lower fat</option>
        </select>
      </div>

      {/* Make it yours — one habit the client chooses (required). */}
      <fieldset className="flex flex-col gap-2 border-t border-hairline pt-5">
        <legend className="mb-1 font-label text-sm uppercase tracking-wide text-red">
          Make it yours — pick one habit
        </legend>
        <p className="font-body text-sm text-ink/60">
          We&apos;ll add habits for you, but choose one that&apos;s *yours*. Pick an idea or write your own.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {HABIT_IDEAS.map((idea) => (
            <button
              key={idea.name}
              type="button"
              onClick={() => setOwnHabit(idea.name)}
              aria-pressed={ownHabit === idea.name}
              className={`min-h-tap px-3 py-1.5 font-body text-sm ${
                ownHabit === idea.name ? "border-2 border-red bg-surface text-ink" : "border border-hairline bg-surface text-ink/70"
              }`}
            >
              {idea.name}
            </button>
          ))}
        </div>
        <input
          value={ownHabit}
          onChange={(e) => setOwnHabit(e.target.value)}
          placeholder="…or write your own"
          aria-label="Your own habit"
          className="mt-2 min-h-tap w-full border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink focus:border-ink"
        />
        <input type="hidden" name="own_habit" value={ownHabit} />
        <input type="hidden" name="own_habit_category" value={categoryForIdea(ownHabit)} />
      </fieldset>

      <Button type="submit" disabled={pending}>
        {pending ? "Setting your targets…" : "Set my targets"}
      </Button>
    </form>
  );
}

function UnitToggle({
  value,
  options,
  onChange,
}: {
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex border border-hairline" role="group" aria-label="Units">
      {options.map(([val, label]) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          aria-pressed={value === val}
          className={`min-h-tap px-3 font-label text-xs uppercase tracking-wide ${
            value === val ? "bg-ink text-surface" : "bg-surface text-ink/60"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
