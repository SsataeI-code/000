import Link from "next/link";
import type { ViewerGame } from "@/lib/habits/state";
import { IconFlame, IconBolt } from "@/components/icons";
import { LevelAvatar } from "@/components/habits/LevelAvatar";

/**
 * Persistent level bar — pinned in the client header on every screen so progress
 * is always in view (§ game HUD). Slim, glowing, links to the badges wall.
 * Server-rendered (no per-navigation animation); the big animated HUD lives on
 * Today.
 */
export function LevelBar({ game }: { game: ViewerGame }) {
  const { state, currentStreak } = game;
  const pct = Math.max(state.progressToNext * 100, 5);

  return (
    <Link
      href="/client/achievements"
      aria-label={`Level ${state.level}, ${state.levelName}. ${state.xp} XP. View your badges.`}
      className="flex items-center gap-2.5 rounded-full border border-white/10 bg-grad-elevated px-2.5 py-1.5 text-white shadow-card transition-transform active:scale-[0.99]"
    >
      {/* leveling mascot */}
      <LevelAvatar level={state.level} size={30} className="shrink-0" />

      {/* XP bar + label */}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-label text-[10px] uppercase tracking-wide text-white/85">{state.levelName}</span>
          <span className="inline-flex shrink-0 items-center gap-1 font-label text-[9px] uppercase tracking-wide text-white/55">
            <span className="h-2.5 w-2.5 text-[#ffb03a]"><IconBolt /></span>
            {state.xp.toLocaleString()}
          </span>
        </span>
        <span className="mt-1 block h-2 w-full overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
          <span className="block h-full rounded-full bg-grad-xp" style={{ width: `${pct}%` }} />
        </span>
      </span>

      {/* streak */}
      <span className={`inline-flex shrink-0 items-center gap-1 font-label text-[10px] uppercase tracking-wide ${currentStreak > 0 ? "text-white" : "text-white/40"}`}>
        <span className={`h-3.5 w-3.5 ${currentStreak > 0 ? "text-[#ffb03a]" : "text-white/40"}`}><IconFlame /></span>
        {currentStreak}
      </span>
    </Link>
  );
}
