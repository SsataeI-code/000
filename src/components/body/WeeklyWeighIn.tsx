"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logMeasurementAction, type MeasurementState } from "@/lib/body/actions";
import { kgToLb } from "@/lib/body/trend";

const initial: MeasurementState = {};

/**
 * Weekly weigh-in — surfaces weight right on Today so it's never hard to find
 * (§C body). Stays compact when the client is up to date; when it's been a week
 * (or they've never logged), it prompts a morning weigh-in with an inline quick
 * entry. Morning-framed because a consistent time-of-day makes the trend honest.
 */
export function WeeklyWeighIn({
  latestKg,
  daysSince,
  changeKg,
}: {
  latestKg: number | null;
  daysSince: number | null; // null = never logged
  changeKg: number | null; // 7-ish day change in kg (− = down)
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(logMeasurementAction, initial);
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [open, setOpen] = useState(false);

  const due = daysSince == null || daysSince >= 7;

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  const showWeight = (kg: number) => (unit === "kg" ? `${kg.toFixed(1)} kg` : `${Math.round(kgToLb(kg))} lb`);
  const changeLabel =
    changeKg == null || Math.abs(changeKg) < 0.05
      ? null
      : unit === "kg"
        ? `${changeKg > 0 ? "+" : ""}${changeKg.toFixed(1)} kg`
        : `${changeKg > 0 ? "+" : ""}${(kgToLb(changeKg)).toFixed(1)} lb`;

  // Up to date and not expanded → a compact, findable line.
  if (!due && !open) {
    return (
      <section aria-label="Weight" className="flex items-center justify-between gap-3 border border-hairline bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="font-label text-[10px] uppercase tracking-wide text-ink/50">Weight</p>
          <p className="font-body text-sm text-ink">
            {latestKg != null ? showWeight(latestKg) : "—"}
            {changeLabel ? <span className="text-ink/50"> · {changeLabel} this week</span> : null}
            {daysSince != null ? <span className="text-ink/40"> · {daysSince === 0 ? "today" : `${daysSince}d ago`}</span> : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-tap font-label text-[10px] uppercase tracking-wide text-red underline underline-offset-4"
          >
            Weigh in
          </button>
          <Link href="/client/body" className="min-h-tap font-label text-[10px] uppercase tracking-wide text-ink/50 underline underline-offset-4 hover:text-red">
            Trend
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Weekly weigh-in" className="flex flex-col gap-3 border border-hairline bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-label text-[10px] uppercase tracking-wide text-red">Weekly weigh-in</p>
          <p className="mt-0.5 font-body text-sm text-ink">
            {due
              ? "Time for your weekly weigh-in — log your morning weight."
              : "Log today's morning weight."}
          </p>
          <p className="mt-0.5 font-body text-xs text-ink/50">
            Best first thing: after the bathroom, before eating or drinking.
            {latestKg != null ? ` Last: ${showWeight(latestKg)}${changeLabel ? ` · ${changeLabel} this week` : ""}.` : ""}
          </p>
        </div>
        <UnitToggle unit={unit} onChange={setUnit} />
      </div>

      <form action={formAction} className="flex items-end gap-2">
        <input type="hidden" name="weight_unit" value={unit} />
        <div className="flex-1">
          <label htmlFor="weighin" className="sr-only">Weight in {unit}</label>
          <input
            id="weighin"
            name="weight"
            type="number"
            inputMode="decimal"
            step="0.1"
            required
            placeholder={unit}
            autoFocus={open && !due}
            className="min-h-tap w-full border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink placeholder:text-ink/40 focus:border-ink"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-tap shrink-0 bg-red px-4 py-2.5 font-label text-xs font-600 uppercase tracking-wide text-white hover:bg-red-ink disabled:opacity-50"
        >
          {pending ? "Saving…" : "Log"}
        </button>
        {!due ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-tap shrink-0 font-label text-[10px] uppercase tracking-wide text-ink/50 underline underline-offset-4 hover:text-red"
          >
            Cancel
          </button>
        ) : null}
      </form>

      {state.error ? (
        <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">{state.error}</p>
      ) : null}

      <Link href="/client/body" className="font-label text-[10px] uppercase tracking-wide text-ink/50 underline underline-offset-4 hover:text-red">
        Body fat, measurements &amp; full trend →
      </Link>
    </section>
  );
}

function UnitToggle({ unit, onChange }: { unit: "lb" | "kg"; onChange: (u: "lb" | "kg") => void }) {
  return (
    <div className="flex shrink-0 border border-hairline" role="group" aria-label="Weight units">
      {(["lb", "kg"] as const).map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          aria-pressed={unit === u}
          className={`min-h-tap px-3 font-label text-xs uppercase tracking-wide ${unit === u ? "bg-elevated text-white" : "bg-surface text-ink/60"}`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}
