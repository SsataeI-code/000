"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toggleHabitAction } from "@/lib/habits/actions";
import type { HabitCategory } from "@/lib/types/db";

export interface TodayHabitItem {
  id: string;
  name: string;
  category: HabitCategory;
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
 * Today's habits to check off — the star of the screen (§5A, §5 hierarchy).
 * One tap toggles completion; the streak count and a warm nudge come with it.
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

  function toggle() {
    setDone((v) => !v); // optimistic
    start(async () => {
      await toggleHabitAction(item.id);
      router.refresh();
    });
  }

  return (
    <li className={pending ? "opacity-70" : ""}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={done}
        className="flex w-full min-h-tap items-center gap-3 px-4 py-3 text-left"
      >
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center border-2"
          style={{
            borderColor: done ? "#1f8a4c" : "#ececea",
            background: done ? "#1f8a4c" : "transparent",
          }}
        >
          {done ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
              <path d="M5 12l5 5L20 6" />
            </svg>
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block font-body text-base ${done ? "text-ink/50 line-through" : "text-ink"}`}>
            {item.name}
          </span>
          {item.why && !done ? (
            <span className="block font-body text-xs text-ink/50">{item.why}</span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: CATEGORY_DOT[item.category] }}
          />
          {item.streak > 0 ? (
            <span className="font-label text-xs uppercase tracking-wide text-ink/60">
              {item.streak}d
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
