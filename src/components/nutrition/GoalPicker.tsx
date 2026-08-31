"use client";

import { useActionState } from "react";
import { setMyGoalAction, type GoalState } from "@/lib/nutrition/actions";
import { GOAL_OPTIONS } from "@/lib/nutrition/types";
import { Button } from "@/components/ui/Button";
import type { Goal } from "@/lib/types/db";

const initial: GoalState = {};

/**
 * Client changes their own goal (owner decision: clients can change goals).
 * Saving recomputes their calorie + macro targets and notifies their coach.
 */
export function GoalPicker({ goal }: { goal: Goal }) {
  const [state, action, pending] = useActionState(setMyGoalAction, initial);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-5 shadow-card">
      <div>
        <h2 className="text-2xl text-ink">Your goal</h2>
        <p className="mt-0.5 font-body text-sm text-ink/60">Change this and we&apos;ll recalculate your calories &amp; macros. Your coach is notified.</p>
      </div>
      {state.error ? (
        <p role="alert" className="rounded-lg border border-red bg-surface px-3 py-2 text-sm text-red-ink">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p role="status" className="rounded-lg border border-success bg-surface px-3 py-2 text-sm text-success">Goal updated — your targets were recalculated.</p>
      ) : null}
      <form action={action} className="flex flex-col gap-3">
        <select
          name="goal"
          defaultValue={goal}
          className="min-h-tap w-full rounded-lg border border-hairline bg-surface-input px-3.5 py-2.5 font-body text-base text-ink focus:border-red focus:outline-none focus:ring-2 focus:ring-red/30"
        >
          {GOAL_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>{g.label} — {g.help}</option>
          ))}
        </select>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Update my goal"}</Button>
      </form>
    </section>
  );
}
