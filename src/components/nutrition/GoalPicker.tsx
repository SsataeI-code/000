"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMyGoalDirect } from "@/lib/nutrition/actions";
import { GOAL_OPTIONS } from "@/lib/nutrition/types";
import type { Goal } from "@/lib/types/db";

/**
 * The client's goal, front-and-centre and one tap to change (owner: clients can
 * change goals, and it should be clear). Tapping a goal saves it, recomputes
 * their calories + macros, and notifies their coach.
 */
export function GoalPicker({ goal }: { goal: Goal }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Goal>(goal);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const current = GOAL_OPTIONS.find((g) => g.value === selected);

  function choose(next: Goal) {
    if (next === selected || pending) return;
    const prev = selected;
    setSelected(next); // optimistic
    setError(null);
    start(async () => {
      const res = await setMyGoalDirect(next);
      if (res.error) {
        setSelected(prev);
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <section aria-label="Your goal" className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-label text-[10px] uppercase tracking-widest text-ink/50">Your goal</p>
          <p className="mt-0.5 font-display text-2xl uppercase text-ink">{current?.label ?? selected}</p>
        </div>
        {pending ? <span className="font-label text-[10px] uppercase tracking-wide text-ink/50">Saving…</span> : null}
      </div>
      <p className="font-body text-sm text-ink/60">{current?.help} Tap to change — your calories &amp; macros update and your coach is told.</p>
      {error ? <p role="alert" className="rounded-lg border border-red bg-surface px-3 py-2 text-sm text-red-ink">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {GOAL_OPTIONS.map((g) => {
          const active = g.value === selected;
          return (
            <button
              key={g.value}
              type="button"
              onClick={() => choose(g.value)}
              disabled={pending}
              aria-pressed={active}
              className={`min-h-tap rounded-full border px-4 py-2 font-label text-xs font-600 uppercase tracking-wide transition-transform active:scale-95 disabled:opacity-60 ${
                active
                  ? "border-transparent bg-grad-red text-white shadow-glow"
                  : "border-hairline bg-surface-input text-ink hover:border-red"
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
