"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toggleHabitAction, setHabitValueAction } from "@/lib/habits/actions";
import { IconFlame, IconShield } from "@/components/icons";
import type { HabitCategory, HabitType } from "@/lib/types/db";

const STREAK_MILESTONE = new Set([3, 7, 14, 30, 60, 100]);
const TIP_KEY = "tff-habit-tip-seen";

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
  frozen?: boolean;
  why: string | null;
}

const CATEGORY_DOT: Record<HabitCategory, string> = {
  nutrition: "#e10600",
  movement: "#f4f4f2",
  sleep: "#34c759",
  mindfulness: "#8a6d1f",
  hydration: "#1f6d8a",
  recovery: "#5a1f8a",
};

/**
 * Today's habits to check off — the star of the screen (§5A). Check-off habits
 * are one tap on the whole row; counter/steps habits take a number (§7). A
 * dismissible first-time tip explains check-offs, streaks, and the calendar.
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

  return (
    <section aria-label="Today's habits" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl text-ink">Habits</h2>
        <Link href="/client/habits" className="min-h-tap font-label text-xs uppercase tracking-wide text-red underline underline-offset-4">
          Manage
        </Link>
      </div>
      <HabitTip />
      <ul className="flex flex-col divide-y divide-hairline border border-hairline bg-surface">
        {items.map((item) => (
          <HabitRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

/** First-time how-it-works tip. Shows once, then remembered on this device. */
function HabitTip() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(TIP_KEY) !== "1") setShow(true);
    } catch {
      /* private mode — just don't show it */
    }
  }, []);
  if (!show) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(TIP_KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };
  return (
    <div className="flex items-start gap-3 border border-hairline bg-elevated p-4">
      <div className="min-w-0 flex-1 font-body text-sm text-white/90">
        <p className="font-600">How it works</p>
        <p className="mt-1 text-white/70">
          Tap a habit to check it off. Do it daily and your streak builds — miss one and a streak-freeze protects
          your chain. Your progress calendar fills in under <span className="text-white">Manage</span>.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="min-h-tap shrink-0 font-label text-[10px] uppercase tracking-wide text-white/70 underline underline-offset-4 hover:text-white"
      >
        Got it
      </button>
    </div>
  );
}

/** The check circle — a shared visual, whether or not the whole row is the tap target. */
function CheckCircle({ done, celebrate }: { done: boolean; celebrate: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-8 w-8 shrink-0 items-center justify-center border-2 ${celebrate ? "animate-red-pulse" : ""}`}
      style={{ borderColor: done ? "#34c759" : "#2c2c31", background: done ? "#34c759" : "transparent" }}
    >
      {done ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
          <path d="M5 12l5 5L20 6" />
        </svg>
      ) : null}
    </span>
  );
}

function HabitRow({ item }: { item: TodayHabitItem }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(item.doneToday);
  const [celebrate, setCelebrate] = useState(false);
  const [value, setValue] = useState(item.todayValue ? String(item.todayValue) : "");
  const isCounter = item.type !== "checkbox";

  // Optimistic streak so the flame ticks up the instant they tap.
  const shownStreak = done ? (item.doneToday ? item.streak : item.streak + 1) : item.streak;
  const isMilestone = done && STREAK_MILESTONE.has(shownStreak);

  function markDone(next: boolean) {
    setDone(next);
    if (next) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 900);
    }
    start(async () => {
      await toggleHabitAction(item.id);
      router.refresh();
    });
  }
  function logValue(v: number) {
    setValue(String(v));
    start(async () => {
      await setHabitValueAction(item.id, v);
      router.refresh();
    });
  }

  const label = (
    <div className="min-w-0 flex-1">
      <span className={`block font-body text-base ${done ? "text-ink/50 line-through" : "text-ink"}`}>{item.name}</span>
      {isCounter && item.target ? (
        <span className="block font-body text-xs text-ink/50">
          {item.todayValue || 0} / {item.target} {item.unit ?? ""}
        </span>
      ) : item.why && !done ? (
        <span className="block font-body text-xs text-ink/50">{item.why}</span>
      ) : null}
    </div>
  );

  const status = (
    <span className="flex shrink-0 items-center gap-2">
      {celebrate ? (
        <span className="animate-red-pulse font-label text-[11px] font-600 uppercase tracking-wide text-red">+10 XP</span>
      ) : null}
      {item.frozen && !celebrate ? (
        <span
          title="Streak freeze: a missed day is protecting your chain."
          className="inline-flex items-center gap-1 font-label text-[11px] uppercase tracking-wide text-[#1f6d8a]"
        >
          <span className="h-3.5 w-3.5"><IconShield /></span>
          saved
        </span>
      ) : null}
      {shownStreak > 0 ? (
        <span className={`inline-flex items-center gap-1 font-label text-xs uppercase tracking-wide ${isMilestone ? "text-red" : "text-ink/60"}`}>
          <span className="h-3.5 w-3.5 text-red"><IconFlame /></span>
          {shownStreak}d
        </span>
      ) : (
        <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_DOT[item.category] }} />
      )}
    </span>
  );

  // Counter/steps: enter a number (or one-tap "Hit it" when a target is set); the circle also toggles done.
  if (isCounter) {
    return (
      <li className={pending ? "opacity-70" : ""}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => markDone(!done)}
            aria-pressed={done}
            aria-label={done ? `Mark ${item.name} not done` : `Mark ${item.name} done`}
            className="flex min-h-tap min-w-tap items-center justify-center rounded-sm hover:bg-surface-muted"
          >
            <CheckCircle done={done} celebrate={celebrate} />
          </button>
          {label}
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
            {item.target ? (
              <button
                type="button"
                onClick={() => logValue(item.target as number)}
                disabled={pending}
                aria-label={`Log ${item.name} — target met`}
                className="min-h-tap bg-success px-2.5 py-1 font-label text-[10px] uppercase tracking-wide text-white disabled:opacity-50"
              >
                Hit it
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => logValue(Number(value) || 0)}
              disabled={pending}
              className="min-h-tap bg-elevated px-2.5 py-1 font-label text-[10px] uppercase tracking-wide text-white disabled:opacity-50"
            >
              Log
            </button>
          </div>
        </div>
      </li>
    );
  }

  // Check-off habit: the WHOLE ROW is the tap target — bigger, easier, and accessible.
  return (
    <li className={pending ? "opacity-70" : ""}>
      <button
        type="button"
        onClick={() => markDone(!done)}
        aria-pressed={done}
        aria-label={done ? `Mark ${item.name} not done` : `Mark ${item.name} done`}
        className="flex min-h-tap w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted"
      >
        <CheckCircle done={done} celebrate={celebrate} />
        {label}
        {status}
      </button>
    </li>
  );
}
