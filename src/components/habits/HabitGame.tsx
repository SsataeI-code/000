"use client";

import { useEffect, useState } from "react";
import type { GameState } from "@/lib/habits/game";
import { IconFlame, IconBolt } from "@/components/icons";

/**
 * The rewarding habit banner (§4 "celebrate wins", §5A habits are the star).
 * Level + XP toward the next, streak flame, and today's progress — bars animate
 * to value on mount (neutralized for reduced-motion by the global rule), and a
 * finished day earns an on-brand red stamp (never confetti).
 */
export function HabitGame({
  state,
  todayDone,
  todayDue,
  bestStreak,
  currentStreak,
}: {
  state: GameState;
  todayDone: number;
  todayDue: number;
  bestStreak: number;
  currentStreak: number;
}) {
  const [fill, setFill] = useState(0);
  const [dayFill, setDayFill] = useState(0);
  const dayPct = todayDue > 0 ? Math.min(1, todayDone / todayDue) : 0;
  const perfect = todayDue > 0 && todayDone >= todayDue;

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setFill(state.progressToNext);
      setDayFill(dayPct);
    });
    return () => cancelAnimationFrame(id);
  }, [state.progressToNext, dayPct]);

  const line =
    todayDue === 0
      ? "Add a habit and start earning."
      : todayDone === 0
        ? "Let's put the first win on the board."
        : perfect
          ? "Perfect day. That's how streaks are born."
          : `${todayDue - todayDone} to go — you've got this.`;

  return (
    <section aria-label="Your habit progress" className="border border-hairline bg-ink p-5 text-surface">
      {/* Level + XP */}
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-label text-[10px] uppercase tracking-widest text-surface/60">Level {state.level}</p>
          <p className="font-display text-2xl uppercase tracking-wide text-surface">{state.levelName}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-wide text-surface/80">
          <span className="h-4 w-4 text-red"><IconBolt /></span>
          {state.xp.toLocaleString()} XP
        </span>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden bg-surface/15">
          <div
            className="h-full bg-red"
            style={{ width: `${fill * 100}%`, transition: "width 700ms cubic-bezier(0.16,1,0.3,1)" }}
          />
        </div>
        <p className="mt-1.5 font-body text-xs text-surface/60">
          {state.nextLevelName
            ? `${state.xpToNext?.toLocaleString()} XP to ${state.nextLevelName}`
            : "Top level reached — legend."}
        </p>
      </div>

      {/* Streak + today's points */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Chip
          icon={<span className={currentStreak > 0 ? "text-red" : "text-surface/40"}><IconFlame /></span>}
          label={currentStreak > 0 ? `${currentStreak}-day streak` : "No streak yet"}
        />
        <Chip label={`Best ${bestStreak}d`} />
        {state.todayPoints > 0 ? <Chip label={`+${state.todayPoints} today`} accent /> : null}
        <Chip label={`${state.earnedCount} badges`} />
      </div>

      {/* Today's completion */}
      <div className="mt-4 border-t border-surface/15 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-label text-[10px] uppercase tracking-widest text-surface/60">Today</p>
          {perfect ? (
            <span className="animate-red-pulse border border-red bg-red px-2 py-0.5 font-label text-[10px] uppercase tracking-widest text-surface">
              Perfect day
            </span>
          ) : (
            <p className="font-body text-xs text-surface/70">{todayDone} of {todayDue} done</p>
          )}
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden bg-surface/15">
          <div
            className={perfect ? "h-full bg-success" : "h-full bg-surface"}
            style={{ width: `${dayFill * 100}%`, transition: "width 600ms cubic-bezier(0.16,1,0.3,1)" }}
          />
        </div>
        <p className="mt-2 font-body text-sm text-surface/85">{line}</p>
      </div>
    </section>
  );
}

function Chip({ icon, label, accent }: { icon?: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 font-label text-[11px] uppercase tracking-wide ${
        accent ? "border-red text-red" : "border-surface/25 text-surface/80"
      }`}
    >
      {icon ? <span className="h-3.5 w-3.5">{icon}</span> : null}
      {label}
    </span>
  );
}
