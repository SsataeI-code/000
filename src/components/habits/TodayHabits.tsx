"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toggleHabitAction, setHabitValueAction } from "@/lib/habits/actions";
import type { HabitCategory, HabitType } from "@/lib/types/db";

export interface TodayHabitItem {
  id: string;
  name: string;
  category: HabitCategory;
  type: HabitType;
  target: number | null;
  unit: string | null;
  todayValue: number;
  doneToday: boolean;
  streak: number;
  why: string | null;
}

const CATEGORY_DOT: Record<HabitCategory, string> = {
  nutrition: "#e10600",
  movement: "#0c0c0d",
  sleep: "#1f8a4c",
  mindfulness: "#8a6d1f",
  hydration: "#1f6d8a",
  recovery: "#5a1f8a",
};

/**
 * Today's habits to check off — the star of the screen (§5A). Checkbox habits
 * are one tap; counter/steps habits take a number (manual entry, §7).
 */
export function TodayHabits({ items }: { items: TodayHabitItem[] }) {
  if (items.length === 0) {
    return (
      <section aria-label="Today's habits" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl text-ink">Habits</h2>
          <Link href="/client/habits" className="min-h-tap font-label text-xs uppercase tracking-wide text-red underline underline-offset-4">
            Build a habit
          </Link>
        </div>
        <p className="border border-hairline bg-surface p-5 font-body text-sm text-ink/60">
          Your habits will live here — the heart of the app. Start with one small thing.
        </p>
      </section>
    );
  }

  const done = items.filter((i) => i.doneToday).length;

  return (
    <section aria-label="Today's habits" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl text-ink">Habits</h2>
        <Link href="/client/habits" className="min-h-tap font-label text-xs uppercase tracking-wide text-red underline underline-offset-4">
          Manage
        </Link>
      </div>
      <p className="font-label text-xs uppercase tracking-wide text-ink/50">
        {done} of {items.length} done today
      </p>
      <ul className="flex flex-col divide-y divide-hairline border border-hairline bg-surface">
        {items.map((item) => (
          <HabitRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

function HabitRow({ item }: { item: TodayHabitItem }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(item.doneToday);
  const [value, setValue] = useState(item.todayValue ? String(item.todayValue) : "");
  const isCounter = item.type !== "checkbox";

  function toggle() {
    setDone((v) => !v);
    start(async () => {
      await toggleHabitAction(item.id);
      router.refresh();
    });
  }
  function logValue() {
    start(async () => {
      await setHabitValueAction(item.id, Number(value) || 0);
      router.refresh();
    });
  }

  return (
    <li className={pending ? "opacity-70" : ""}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={done}
          aria-label={done ? `Mark ${item.name} not done` : `Mark ${item.name} done`}
          className="flex h-7 w-7 shrink-0 items-center justify-center border-2"
          style={{ borderColor: done ? "#1f8a4c" : "#ececea", background: done ? "#1f8a4c" : "transparent" }}
        >
          {done ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
              <path d="M5 12l5 5L20 6" />
            </svg>
          ) : null}
        </button>

        <div className="min-w-0 flex-1">
          <span className={`block font-body text-base ${done ? "text-ink/50 line-through" : "text-ink"}`}>
            {item.name}
          </span>
          {isCounter && item.target ? (
            <span className="block font-body text-xs text-ink/50">
              {item.todayValue || 0} / {item.target} {item.unit ?? ""}
            </span>
          ) : item.why && !done ? (
            <span className="block font-body text-xs text-ink/50">{item.why}</span>
          ) : null}
        </div>

        {isCounter ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <input
              type="number"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={item.target ? String(item.target) : item.unit ?? ""}
              aria-label={`${item.name} amount`}
              className="min-h-tap w-16 border border-hairline bg-surface px-2 py-1 text-right font-body text-sm"
            />
            <button
              type="button"
              onClick={logValue}
              disabled={pending}
              className="min-h-tap bg-ink px-2.5 py-1 font-label text-[10px] uppercase tracking-wide text-surface disabled:opacity-50"
            >
              Log
            </button>
          </div>
        ) : (
          <span className="flex shrink-0 items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_DOT[item.category] }} />
            {item.streak > 0 ? (
              <span className="font-label text-xs uppercase tracking-wide text-ink/60">{item.streak}d</span>
            ) : null}
          </span>
        )}
      </div>
    </li>
  );
}
