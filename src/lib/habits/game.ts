import type { Habit } from "@/lib/types/db";
import { isScheduledOn, longestStreak } from "@/lib/habits/streaks";

/**
 * Habit gamification (§5A — habits are the star; §4 celebrate wins on-brand).
 * Pure and derived entirely from existing completion data — no new schema, so
 * points/levels/badges can never drift out of sync with the real logs. XP is
 * earned by showing up (completions) and by keeping chains alive (streaks).
 */

export const POINTS_PER_COMPLETION = 10;

/** Streak milestones award a one-time bonus and a name to celebrate. */
export const STREAK_MILESTONES: { days: number; bonus: number; label: string }[] = [
  { days: 3, bonus: 30, label: "3-Day Spark" },
  { days: 7, bonus: 70, label: "One Week" },
  { days: 14, bonus: 140, label: "Two Weeks" },
  { days: 30, bonus: 300, label: "One Month" },
  { days: 60, bonus: 600, label: "Two Months" },
  { days: 100, bonus: 1000, label: "Century" },
];

/** Level ladder — warm, earned names, not cold numbers. */
export const LEVELS: { min: number; name: string }[] = [
  { min: 0, name: "Spark" },
  { min: 250, name: "Kindling" },
  { min: 600, name: "Steady" },
  { min: 1200, name: "Committed" },
  { min: 2500, name: "Relentless" },
  { min: 5000, name: "Unstoppable" },
  { min: 10000, name: "Legend" },
];

/** One-time bonus total unlocked by a longest-streak of `days`. */
export function streakBonusFor(days: number): number {
  return STREAK_MILESTONES.reduce((sum, m) => (days >= m.days ? sum + m.bonus : sum), 0);
}

export interface GameStats {
  totalCompletions: number;
  perHabitLongest: number[]; // longest streak per habit
  bestStreak: number;
  bestCurrentStreak: number;
  perfectDays: number;
  comebacks: number;
  habitCount: number;
  todayDone: number;
  todayDue: number;
}

export interface Achievement {
  id: string;
  label: string;
  description: string;
  earned: boolean;
}

export interface GameState {
  xp: number;
  level: number; // 1-based
  levelName: string;
  nextLevelName: string | null;
  xpIntoLevel: number;
  xpSpan: number | null; // xp between this level and the next
  progressToNext: number; // 0..1
  xpToNext: number | null;
  todayPoints: number;
  achievements: Achievement[];
  earnedCount: number;
}

/** Total XP: showing up (completions) + keeping chains alive (streak bonuses). */
export function computeXp(stats: Pick<GameStats, "totalCompletions" | "perHabitLongest">): number {
  const base = stats.totalCompletions * POINTS_PER_COMPLETION;
  const streak = stats.perHabitLongest.reduce((sum, d) => sum + streakBonusFor(d), 0);
  return base + streak;
}

/** Resolve XP to a level with progress toward the next. */
export function levelForXp(xp: number): {
  level: number;
  name: string;
  nextName: string | null;
  into: number;
  span: number | null;
  progress: number;
  toNext: number | null;
} {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) idx = i;
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  const into = xp - cur.min;
  const span = next ? next.min - cur.min : null;
  const progress = next && span ? Math.min(1, into / span) : 1;
  return {
    level: idx + 1,
    name: cur.name,
    nextName: next?.name ?? null,
    into,
    span,
    progress,
    toNext: next ? next.min - xp : null,
  };
}

const ACHIEVEMENTS: { id: string; label: string; description: string; test: (s: GameStats) => boolean }[] = [
  { id: "first_step", label: "First Step", description: "Check off your first habit.", test: (s) => s.totalCompletions >= 1 },
  { id: "perfect_day", label: "Perfect Day", description: "Finish every habit due in a day.", test: (s) => s.perfectDays >= 1 },
  { id: "week_warrior", label: "Week Warrior", description: "Reach a 7-day streak.", test: (s) => s.bestStreak >= 7 },
  { id: "comeback", label: "Comeback", description: "Come back to a habit after a miss.", test: (s) => s.comebacks >= 1 },
  { id: "builder", label: "Habit Builder", description: "Build 5 habits.", test: (s) => s.habitCount >= 5 },
  { id: "fifty_club", label: "50 Club", description: "Log 50 check-offs.", test: (s) => s.totalCompletions >= 50 },
  { id: "month_master", label: "Month Master", description: "Reach a 30-day streak.", test: (s) => s.bestStreak >= 30 },
  { id: "perfect_week", label: "Perfect Week", description: "Stack up 7 perfect days.", test: (s) => s.perfectDays >= 7 },
  { id: "centurion", label: "Centurion", description: "Reach a 100-day streak.", test: (s) => s.bestStreak >= 100 },
];

export function computeAchievements(stats: GameStats): Achievement[] {
  return ACHIEVEMENTS.map((a) => ({ id: a.id, label: a.label, description: a.description, earned: a.test(stats) }));
}

/** The whole game state for a client from their aggregate stats. */
export function computeGameState(stats: GameStats): GameState {
  const xp = computeXp(stats);
  const lvl = levelForXp(xp);
  const achievements = computeAchievements(stats);
  return {
    xp,
    level: lvl.level,
    levelName: lvl.name,
    nextLevelName: lvl.nextName,
    xpIntoLevel: lvl.into,
    xpSpan: lvl.span,
    progressToNext: lvl.progress,
    xpToNext: lvl.toNext,
    todayPoints: stats.todayDone * POINTS_PER_COMPLETION,
    achievements,
    earnedCount: achievements.filter((a) => a.earned).length,
  };
}

const DAY_MS = 86_400_000;
const asUTC = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/**
 * Count "perfect days" — days where every habit due was completed. Only days on
 * which something was completed are considered (a day with nothing done can't be
 * perfect), so it's cheap and honest.
 */
export function perfectDayCount(habits: Habit[], completedByHabit: Map<string, Set<string>>): number {
  const dates = new Set<string>();
  for (const set of completedByHabit.values()) for (const d of set) dates.add(d);
  let perfect = 0;
  for (const date of dates) {
    const d = new Date(`${date}T00:00:00Z`);
    let due = 0;
    let done = 0;
    for (const h of habits) {
      if (!isScheduledOn(h, d)) continue;
      due++;
      if (completedByHabit.get(h.id)?.has(date)) done++;
    }
    if (due > 0 && done >= due) perfect++;
  }
  return perfect;
}

/** Assemble the full stat block from a client's habits + completion history. */
export function habitGameStats(params: {
  habits: Habit[];
  completedByHabit: Map<string, Set<string>>;
  totalCompletions: number;
  bestCurrentStreak: number;
  todayDone: number;
  todayDue: number;
}): GameStats {
  const perHabitLongest = params.habits.map((h) => longestStreak(params.completedByHabit.get(h.id) ?? new Set()));
  return {
    totalCompletions: params.totalCompletions,
    perHabitLongest,
    bestStreak: perHabitLongest.reduce((m, v) => Math.max(m, v), 0),
    bestCurrentStreak: params.bestCurrentStreak,
    perfectDays: perfectDayCount(params.habits, params.completedByHabit),
    comebacks: comebackCount(params.completedByHabit),
    habitCount: params.habits.length,
    todayDone: params.todayDone,
    todayDue: params.todayDue,
  };
}

/** Count comebacks — how many times a habit resumed after a gap (resilience). */
export function comebackCount(completedByHabit: Map<string, Set<string>>): number {
  let total = 0;
  for (const set of completedByHabit.values()) {
    const dates = [...set].sort();
    if (dates.length < 2) continue;
    let runs = 1;
    for (let i = 1; i < dates.length; i++) {
      if (Math.round((asUTC(dates[i]) - asUTC(dates[i - 1])) / DAY_MS) > 1) runs++;
    }
    if (runs > 1) total += runs - 1;
  }
  return total;
}
