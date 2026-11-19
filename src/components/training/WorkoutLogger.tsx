"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Exercise, TrainingTrackingType } from "@/lib/types/db";
import { logWorkoutAction, type LogSetInput } from "@/lib/training/actions";

interface SetRow {
  weight: string;
  reps: string;
  timeSec: string;
  distance: string;
  rpe: string;
}
interface Picked {
  key: string;
  exercise: Exercise;
  sets: SetRow[];
}

const emptySet = (): SetRow => ({ weight: "", reps: "", timeSec: "", distance: "", rpe: "" });

/** Which fields matter for a tracking type (keeps the grid to what's relevant). */
function fieldsFor(t: TrainingTrackingType): ("weight" | "reps" | "timeSec" | "distance")[] {
  switch (t) {
    case "weight_reps": return ["weight", "reps"];
    case "bodyweight_reps": return ["reps", "weight"]; // weight = optional added load
    case "time": return ["timeSec"];
    case "distance_time": return ["distance", "timeSec"];
    case "reps": return ["reps"];
  }
}
const FIELD_LABEL: Record<string, string> = { weight: "Weight", reps: "Reps", timeSec: "Time (s)", distance: "Dist" };

const inputCls = "min-h-tap w-full rounded-lg border border-hairline bg-surface px-2 py-2 text-center font-body text-base text-ink focus:border-ink";

/**
 * Simple workout logger (Phase 2). Search the library, add exercises, type the
 * sets, save — fast coach-side data entry (also used by clients for their own
 * workouts). Advanced breakdowns/charts/PRs layer on top later.
 */
export function WorkoutLogger({ exercises, clientId }: { exercises: Exercise[]; clientId: string }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Picked[]>([]);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return exercises.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, exercises]);

  function addExercise(e: Exercise) {
    setSaved(false);
    setPicked((p) => [...p, { key: `${e.id}-${Date.now()}`, exercise: e, sets: [emptySet()] }]);
    setQuery("");
  }
  function removeExercise(key: string) {
    setPicked((p) => p.filter((x) => x.key !== key));
  }
  function addSet(key: string) {
    setPicked((p) => p.map((x) => (x.key === key ? { ...x, sets: [...x.sets, { ...(x.sets[x.sets.length - 1] ?? emptySet()) }] } : x)));
  }
  function removeSet(key: string, i: number) {
    setPicked((p) => p.map((x) => (x.key === key ? { ...x, sets: x.sets.filter((_, j) => j !== i) } : x)));
  }
  function updateSet(key: string, i: number, field: keyof SetRow, value: string) {
    setSaved(false);
    setPicked((p) => p.map((x) => (x.key === key ? { ...x, sets: x.sets.map((s, j) => (j === i ? { ...s, [field]: value } : s)) } : x)));
  }

  function save() {
    setError(null);
    const sets: LogSetInput[] = [];
    for (const p of picked) {
      p.sets.forEach((s, i) => {
        const toNum = (v: string) => (v.trim() === "" ? null : Number(v));
        sets.push({
          exerciseId: p.exercise.id,
          setNo: i + 1,
          weight: toNum(s.weight),
          reps: toNum(s.reps),
          timeSec: toNum(s.timeSec),
          distance: toNum(s.distance),
          rpe: toNum(s.rpe),
        });
      });
    }
    startSave(async () => {
      const res = await logWorkoutAction({ clientId, logDate: date, notes, sets });
      if (res.error) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setPicked([]);
      setNotes("");
      router.refresh();
    });
  }

  const totalSets = picked.reduce((n, p) => n + p.sets.length, 0);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface shadow-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl text-ink">Log a workout</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Workout date"
          className="min-h-tap rounded-lg border border-hairline bg-surface px-3 py-2 font-body text-sm text-ink focus:border-ink"
        />
      </div>

      {error ? <p role="alert" className="rounded-lg border border-red bg-surface px-3 py-2 text-sm text-red-ink">{error}</p> : null}
      {saved ? <p role="status" className="rounded-lg border border-success bg-surface px-3 py-2 text-sm text-success">Workout saved.</p> : null}

      {/* Exercise search */}
      <div className="flex flex-col gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises… (e.g. bench, squat, plank)"
          aria-label="Search exercises"
          className="min-h-tap w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink placeholder:text-ink/40 focus:border-ink"
        />
        {matches.length > 0 ? (
          <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline bg-surface">
            {matches.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => addExercise(e)} className="flex w-full min-h-tap items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-surface-muted">
                  <span className="font-body text-sm text-ink">{e.name}</span>
                  <span className="font-body text-sm text-ink/45">{e.equipment ?? ""}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Picked exercises + sets */}
      {picked.length === 0 ? (
        <p className="font-body text-sm text-ink/55">Search above and tap an exercise to start logging sets.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {picked.map((p) => {
            const fields = fieldsFor(p.exercise.tracking_type);
            return (
              <div key={p.key} className="rounded-xl border border-hairline bg-surface-muted p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-body text-base text-ink">{p.exercise.name}</span>
                  <button type="button" onClick={() => removeExercise(p.key)} className="min-h-tap font-label text-sm uppercase tracking-wide text-ink/50 hover:text-red">Remove</button>
                </div>
                {/* column headers */}
                <div className="flex items-center gap-2 px-1 pb-1 font-label text-sm uppercase tracking-wide text-ink/45">
                  <span className="w-6 shrink-0">#</span>
                  {fields.map((f) => <span key={f} className="flex-1 text-center">{FIELD_LABEL[f]}</span>)}
                  <span className="flex-1 text-center">RPE</span>
                  <span className="w-8 shrink-0" />
                </div>
                <div className="flex flex-col gap-1.5">
                  {p.sets.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-6 shrink-0 text-center font-display text-lg text-ink">{i + 1}</span>
                      {fields.map((f) => (
                        <input
                          key={f}
                          type="number"
                          inputMode="decimal"
                          value={s[f]}
                          onChange={(e) => updateSet(p.key, i, f, e.target.value)}
                          aria-label={`${p.exercise.name} set ${i + 1} ${FIELD_LABEL[f]}`}
                          className={`${inputCls} flex-1`}
                        />
                      ))}
                      <input
                        type="number"
                        inputMode="decimal"
                        value={s.rpe}
                        onChange={(e) => updateSet(p.key, i, "rpe", e.target.value)}
                        aria-label={`${p.exercise.name} set ${i + 1} RPE`}
                        className={`${inputCls} flex-1`}
                      />
                      <button type="button" onClick={() => removeSet(p.key, i)} aria-label="Remove set" className="flex h-9 w-8 min-h-tap shrink-0 items-center justify-center text-lg text-ink/50 hover:text-red">−</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addSet(p.key)} className="mt-2 min-h-tap font-label text-sm uppercase tracking-wide text-red underline underline-offset-4">+ Add set</button>
              </div>
            );
          })}
        </div>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Session notes (optional)"
        aria-label="Session notes"
        rows={2}
        className="w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink placeholder:text-ink/40 focus:border-ink"
      />

      <button
        type="button"
        onClick={save}
        disabled={saving || totalSets === 0}
        className="min-h-tap rounded-xl bg-grad-red px-5 py-3 font-label text-sm font-600 uppercase tracking-wide text-white shadow-pop-red transition-transform active:translate-y-[3px] disabled:opacity-40"
      >
        {saving ? "Saving…" : `Save workout${totalSets ? ` · ${totalSets} set${totalSets === 1 ? "" : "s"}` : ""}`}
      </button>
    </section>
  );
}
