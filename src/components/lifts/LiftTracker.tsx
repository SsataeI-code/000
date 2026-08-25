"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logLiftAction, deleteLiftAction, type LiftFormState } from "@/lib/lifts/actions";
import { e1rm, toLb, personalBests, exerciseNames, type LiftEntry } from "@/lib/lifts/progress";

const initial: LiftFormState = {};

/**
 * Spreadsheet-style lift log (owner decision, 2026). Add a set at the top; the
 * grid below is the client's training history with an estimated 1RM per set and
 * a personal-best strip. Read-only for a coach viewing a client.
 */
export function LiftTracker({ entries, readOnly = false }: { entries: LiftEntry[]; readOnly?: boolean }) {
  const bests = personalBests(entries);
  const names = exerciseNames(entries);

  return (
    <div className="flex flex-col gap-6">
      {!readOnly ? <LiftForm knownExercises={names} /> : null}

      {bests.length > 0 ? (
        <section className="flex flex-col gap-2">
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Personal bests</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {bests.map((b) => (
              <div key={b.exercise} className="rounded-lg border border-hairline bg-surface p-3">
                <p className="truncate font-body text-sm text-ink">{b.exercise}</p>
                <p className="mt-1 font-display text-xl text-ink">{b.topWeightLb} lb</p>
                <p className="font-body text-[11px] text-ink/50">
                  best set · ~{b.bestE1rmLb} lb 1RM
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">History</p>
        {entries.length === 0 ? (
          <p className="rounded-lg border border-hairline bg-surface p-5 font-body text-sm text-ink/60">
            {readOnly ? "No lifts logged yet." : "No lifts yet — log your first set above to start tracking progress."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-hairline">
                  {["Date", "Exercise", "Weight", "Reps", "Sets", "e1RM", ""].map((h) => (
                    <th key={h} className="px-3 py-2 font-label text-[10px] uppercase tracking-wide text-ink/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <LiftRow key={e.id} entry={e} readOnly={readOnly} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="font-body text-[11px] text-ink/40">
          e1RM is an estimated one-rep max (Epley) from the weight and reps you logged.
        </p>
      </section>
    </div>
  );
}

function LiftRow({ entry, readOnly }: { entry: LiftEntry; readOnly: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const est = e1rm(toLb(entry.weight, entry.unit), entry.reps);
  return (
    <tr className={`border-b border-hairline last:border-0 ${pending ? "opacity-50" : ""}`}>
      <td className="px-3 py-2 font-body text-xs text-ink/60">{entry.log_date.slice(5)}</td>
      <td className="px-3 py-2 font-body text-sm text-ink">{entry.exercise}</td>
      <td className="px-3 py-2 font-body text-sm text-ink">{entry.weight} {entry.unit}</td>
      <td className="px-3 py-2 font-body text-sm text-ink/80">{entry.reps}</td>
      <td className="px-3 py-2 font-body text-sm text-ink/80">{entry.sets}</td>
      <td className="px-3 py-2 font-body text-sm text-ink/80">{est} lb</td>
      <td className="px-2 py-2 text-right">
        {!readOnly ? (
          <button
            type="button"
            onClick={() => start(async () => { await deleteLiftAction(entry.id); router.refresh(); })}
            aria-label={`Delete ${entry.exercise} on ${entry.log_date}`}
            className="min-h-tap px-2 font-label text-[10px] uppercase tracking-wide text-ink/40 hover:text-red"
          >
            ✕
          </button>
        ) : null}
      </td>
    </tr>
  );
}

function LiftForm({ knownExercises }: { knownExercises: string[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(logLiftAction, initial);
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      // Keep the exercise name (they often log several sets), reset the numbers.
      formRef.current?.querySelectorAll<HTMLInputElement>("input[data-clear]").forEach((el) => (el.value = ""));
      router.refresh();
    }
  }, [state, router]);

  const field = "min-h-tap w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink placeholder:text-ink/40 focus:border-ink";

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 rounded-lg border border-hairline bg-surface p-4">
      <p className="font-label text-xs uppercase tracking-wide text-ink">Log a set</p>
      {state.error ? (
        <p role="alert" className="rounded-lg border border-red bg-surface px-3 py-2 text-sm text-red-ink">{state.error}</p>
      ) : null}

      <div>
        <label htmlFor="exercise" className="sr-only">Exercise</label>
        <input id="exercise" name="exercise" list="exercises" required maxLength={80} placeholder="Exercise (e.g. Bench press)" className={field} />
        <datalist id="exercises">
          {knownExercises.map((n) => <option key={n} value={n} />)}
        </datalist>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex flex-1 items-stretch gap-1">
          <input data-clear name="weight" type="number" inputMode="decimal" step="0.5" min={0} required placeholder="Weight" aria-label="Weight" className={field} />
          <div className="flex shrink-0 border border-hairline" role="group" aria-label="Weight units">
            {(["lb", "kg"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                aria-pressed={unit === u}
                className={`min-h-tap px-3 font-label text-xs uppercase tracking-wide ${unit === u ? "bg-elevated text-white" : "bg-surface text-ink/60"}`}
              >
                {u}
              </button>
            ))}
          </div>
          <input type="hidden" name="unit" value={unit} />
        </div>
        <input data-clear name="reps" type="number" inputMode="numeric" min={0} required placeholder="Reps" aria-label="Reps" className={`${field} w-24 flex-none`} />
        <input data-clear name="sets" type="number" inputMode="numeric" min={1} defaultValue={1} placeholder="Sets" aria-label="Sets" className={`${field} w-20 flex-none`} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="min-h-tap self-start bg-red px-5 py-2 font-label text-xs font-600 uppercase tracking-wide text-white hover:bg-red-ink disabled:opacity-50"
      >
        {pending ? "Saving…" : "Log set"}
      </button>
    </form>
  );
}
