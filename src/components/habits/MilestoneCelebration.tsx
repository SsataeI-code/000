"use client";

import { useEffect, useState } from "react";
import { IconBolt, IconMedal } from "@/components/icons";
import { LevelAvatar } from "@/components/habits/LevelAvatar";

/**
 * Milestone celebrations (§4 "micro-celebrations as an on-brand red pulse/stamp,
 * never confetti"). A quiet client-side watcher: it diffs the viewer's current
 * level and earned badges against what this device last saw and, when something
 * new is unlocked, shows one warm celebration moment. First run seeds silently —
 * we never replay a client's whole history at them. Purely a reward layer; it
 * reads nothing, writes nothing to the server, and honors reduced-motion.
 */

const LEVEL_KEY = "tff-milestone-level";
const BADGES_KEY = "tff-milestone-badges";

interface Badge {
  id: string;
  label: string;
  description: string;
  earned: boolean;
}

interface Celebration {
  kind: "level" | "badge";
  title: string;
  line: string;
  sub: string;
}

export function MilestoneCelebration({
  level,
  levelName,
  achievements,
}: {
  level: number;
  levelName: string;
  achievements: Badge[];
}) {
  const [queue, setQueue] = useState<Celebration[]>([]);

  useEffect(() => {
    const earnedIds = achievements.filter((a) => a.earned).map((a) => a.id);
    let seenLevel: number | null = null;
    let seenBadges: string[] | null = null;
    try {
      const rawLevel = localStorage.getItem(LEVEL_KEY);
      if (rawLevel != null) seenLevel = Number.parseInt(rawLevel, 10);
      const rawBadges = localStorage.getItem(BADGES_KEY);
      if (rawBadges != null) seenBadges = JSON.parse(rawBadges) as string[];
    } catch {
      // storage blocked — behave as first run, seed below, celebrate nothing now
    }

    const firstRun = seenLevel == null || !Array.isArray(seenBadges);
    const next: Celebration[] = [];

    if (!firstRun) {
      if (Number.isFinite(seenLevel) && level > (seenLevel as number)) {
        next.push({
          kind: "level",
          title: "Level up",
          line: `You're now ${levelName}`,
          sub: `Level ${level} — every check-off and log got you here.`,
        });
      }
      const seen = new Set(seenBadges as string[]);
      for (const a of achievements) {
        if (a.earned && !seen.has(a.id)) {
          next.push({ kind: "badge", title: "Badge unlocked", line: a.label, sub: a.description });
        }
      }
    }

    // Record the current state either way (first run seeds silently).
    try {
      localStorage.setItem(LEVEL_KEY, String(level));
      localStorage.setItem(BADGES_KEY, JSON.stringify(earnedIds));
    } catch {
      // ignore — a blocked store just means we celebrate again next time
    }

    if (next.length > 0) setQueue(next);
    // Re-run only when the milestone-bearing values actually change.
  }, [level, levelName, achievements]);

  if (queue.length === 0) return null;

  const current = queue[0];
  const dismiss = () => setQueue((q) => q.slice(1));

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${current.title}: ${current.line}`}
      onClick={dismiss}
    >
      <div
        className="animate-pop-in relative w-full max-w-[340px] overflow-hidden rounded-3xl border border-white/10 bg-grad-elevated p-7 text-center text-white shadow-glow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* on-brand red stamp glow behind the mark */}
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-16 -z-0 h-40 w-40 -translate-x-1/2 rounded-full bg-red/25 blur-3xl animate-glow-pulse" />

        <span className="relative z-10 grid place-items-center gap-4">
          <span className="animate-level-up">
            {current.kind === "level" ? (
              <LevelAvatar level={level} size={84} />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-full bg-grad-red text-white shadow-glow">
                <span className="h-10 w-10"><IconMedal /></span>
              </span>
            )}
          </span>

          <span className="block">
            <span className="block font-label text-[11px] uppercase tracking-[0.18em] text-red-ink">{current.title}</span>
            <span className="mt-1 block font-display text-3xl uppercase leading-tight text-white">{current.line}</span>
            <span className="mt-2 block font-body text-sm text-white/70">{current.sub}</span>
          </span>

          {current.kind === "level" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-label text-[10px] uppercase tracking-wide text-white/80">
              <span className="h-3 w-3 text-[#ffb03a]"><IconBolt /></span>
              Keep the streak alive
            </span>
          ) : null}

          <button
            type="button"
            onClick={dismiss}
            autoFocus
            className="mt-1 min-h-tap w-full rounded-xl bg-grad-red px-5 py-3 font-label text-xs uppercase tracking-wide text-white shadow-pop-red transition-transform active:translate-y-[3px]"
          >
            {queue.length > 1 ? `Nice — next (${queue.length - 1})` : "Let's go"}
          </button>
        </span>
      </div>
    </div>
  );
}
