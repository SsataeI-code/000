import { getHabits, getHabitLogs, completedDatesByHabit } from "@/lib/habits/data";
import { currentStreak, isDueToday, isoDate, FREEZE_BUDGET } from "@/lib/habits/streaks";
import { habitGameStats, computeGameState, type GameState } from "@/lib/habits/game";
import { getLoggingXpCounts } from "@/lib/habits/logging-xp";

export interface ViewerGame {
  state: GameState;
  currentStreak: number;
  todayDone: number;
  todayDue: number;
}

/**
 * The signed-in viewer's live game state — level, XP, streak, today's quest
 * count — from their own habit logs. Used by the persistent header level bar
 * (§ game HUD). Defensive: any read hiccup returns null so the header never
 * breaks the page (reliability #1).
 */
export async function getViewerGame(clientId: string): Promise<ViewerGame | null> {
  try {
    const now = new Date();
    const todayStr = isoDate(now);
    const [habits, habitLogs, logging] = await Promise.all([
      getHabits(clientId),
      getHabitLogs(clientId),
      getLoggingXpCounts(clientId, todayStr),
    ]);
    // Show the level bar once there's any progress — habits OR logging.
    if (habits.length === 0 && logging.foodLogs === 0 && logging.hydrationDays === 0) return null;

    const byHabit = completedDatesByHabit(habitLogs);

    const dueToday = habits.filter((h) => isDueToday(h, byHabit.get(h.id) ?? new Set<string>(), now));
    const todayDue = dueToday.length;
    const todayDone = dueToday.filter((h) => (byHabit.get(h.id) ?? new Set<string>()).has(todayStr)).length;

    const totalCompletions = habitLogs.filter((l) => l.completed).length;
    const bestCurrentStreak = habits.reduce(
      (m, h) => Math.max(m, currentStreak(h, byHabit.get(h.id) ?? new Set<string>(), now, FREEZE_BUDGET)),
      0,
    );

    const stats = habitGameStats({
      habits,
      completedByHabit: byHabit,
      totalCompletions,
      bestCurrentStreak,
      todayDone,
      todayDue,
      foodLogs: logging.foodLogs,
      hydrationDays: logging.hydrationDays,
      todayFoodLogs: logging.todayFoodLogs,
      hydratedToday: logging.hydratedToday,
    });
    const state = computeGameState(stats);
    return { state, currentStreak: bestCurrentStreak, todayDone, todayDue };
  } catch {
    return null;
  }
}
