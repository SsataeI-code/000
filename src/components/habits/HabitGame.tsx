"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GameState } from "@/lib/habits/game";
import { IconFlame, IconBolt, IconMedal } from "@/components/icons";
import { LevelAvatar } from "@/components/habits/LevelAvatar";

/**
 * The game HUD (§4 "celebrate wins", §5A habits are the star). A cartoon-arcade
 * banner: a glowing level badge, a sheened XP bar toward the next level, a streak
 * flame, and a circular "today" progress ring. Bars animate to value on mount
 * (neutralised for reduced-motion by the global rule); a finished day earns an
 * on-brand glowing stamp (never confetti).
 */
export function HabitGame({
  state,
  todayDone,
  todayDue,
  bestStreak,
  currentStreak,
  coachView = false,
  name,
  badgesHref,
}: {
  state: GameState;
  todayDone: number;
  todayDue: number;
  bestStreak: number;
  currentStreak: number;
  coachView?: boolean;
  name?: string;
  badgesHref?: string;
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

  const who = name ? `${name} has` : "Has";
  const line = coachView
    ? todayDue === 0
      ? "No habits due today."
      : perfect
        ? "Perfect day — everything done."
        : todayDone === 0
          ? `${who} ${todayDue} due today, none checked off yet.`
          : `${todayDone} of ${todayDue} done today.`
    : todayDue === 0
      ? "Add a quest and start earning XP."
      : todayDone === 0
        ? "Let's put the first win on the board."
        : perfect
          ? "Perfect day. That's how streaks are born."
          : `${todayDue - todayDone} quest${todayDue - todayDone === 1 ? "" : "s"} to go — you've got this.`;

  // Circular "today" ring geometry.
  const R = 30;
  const C = 2 * Math.PI * R;

  return (
    <section
      aria-label="Your game progress"
      className="animate-pop-in overflow-hidden rounded-2xl border border-white/10 bg-grad-elevated p-5 text-white shadow-card"
    >
      {/* Level + XP */}
      <div className="flex items-center gap-4">
        {/* Leveling mascot — evolves from Spark to Legend */}
        <div className="relative shrink-0">
          <LevelAvatar level={state.level} size={64} />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-1.5 py-0.5 font-label text-[8px] uppercase tracking-widest text-white/90">
            Lvl {state.level}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl uppercase leading-none tracking-wide text-white toon-shadow">{state.levelName}</p>
          <span className="mt-1 inline-flex items-center gap-1.5 font-label text-xs uppercase tracking-wide text-white/85">
            <span className="h-4 w-4 text-[#ffb03a]"><IconBolt /></span>
            {state.xp.toLocaleString()} XP
          </span>

          {/* XP bar toward next level */}
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
            <div
              className="sheen h-full rounded-full bg-grad-xp"
              style={{ width: `${Math.max(fill * 100, 4)}%`, transition: "width 800ms cubic-bezier(0.16,1,0.3,1)" }}
            />
          </div>
          <p className="mt-1 font-body text-[11px] text-white/65">
            {state.nextLevelName ? `${state.xpToNext?.toLocaleString()} XP to ${state.nextLevelName}` : "Top level reached — legend."}
          </p>
        </div>
      </div>

      {/* Streak + badges chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Chip
          glow={currentStreak > 0}
          icon={<span className={currentStreak > 0 ? "text-[#ffb03a]" : "text-white/40"}><IconFlame /></span>}
          label={currentStreak > 0 ? `${currentStreak}-day streak` : "No streak yet"}
        />
        <Chip label={`Best ${bestStreak}d`} />
        {state.todayPoints > 0 ? <Chip label={`+${state.todayPoints} XP today`} accent /> : null}
        {badgesHref ? (
          <Link
            href={badgesHref}
            className="inline-flex min-h-tap items-center gap-1.5 rounded-full border border-white/25 bg-black/25 px-3 py-1 font-label text-[11px] uppercase tracking-wide text-white/85 hover:border-[#ffb03a] hover:text-white"
          >
            <span className="h-3.5 w-3.5 text-[#ffb03a]"><IconMedal /></span>
            {state.earnedCount} badges →
          </Link>
        ) : (
          <Chip label={`${state.earnedCount} badges`} />
        )}
      </div>

      {/* Today's quests — ring + line */}
      <div className="mt-4 flex items-center gap-4 border-t border-white/12 pt-4">
        <div className="relative grid shrink-0 place-items-center">
          <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
            <circle cx="38" cy="38" r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="8" />
            <circle
              cx="38"
              cy="38"
              r={R}
              fill="none"
              stroke={perfect ? "#34c759" : "#e10600"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - dayFill)}
              style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.16,1,0.3,1)", filter: perfect ? "drop-shadow(0 0 6px rgba(52,199,89,0.8))" : "drop-shadow(0 0 6px rgba(225,6,0,0.7))" }}
            />
          </svg>
          <span className="absolute font-display text-lg leading-none text-white">{todayDone}<span className="text-white/50">/{todayDue}</span></span>
        </div>

        <div className="min-w-0 flex-1">
          {perfect ? (
            <span className="animate-level-up inline-block rounded-lg bg-grad-success px-3 py-1 font-display text-sm uppercase tracking-wide text-white shadow-glow-success toon-shadow">
              ★ Perfect day
            </span>
          ) : (
            <p className="font-label text-[10px] uppercase tracking-widest text-white/60">Today&apos;s quests</p>
          )}
          <p className="mt-1.5 font-body text-sm text-white/90">{line}</p>
        </div>
      </div>
    </section>
  );
}

function Chip({ icon, label, accent, glow }: { icon?: React.ReactNode; label: string; accent?: boolean; glow?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-label text-[11px] uppercase tracking-wide ${
        accent
          ? "border-[#ffb03a]/70 bg-[#ffb03a]/15 text-[#ffb03a]"
          : glow
            ? "border-[#ffb03a]/50 bg-black/25 text-white shadow-glow-gold"
            : "border-white/25 bg-black/25 text-white/80"
      }`}
    >
      {icon ? <span className="h-3.5 w-3.5">{icon}</span> : null}
      {label}
    </span>
  );
}
