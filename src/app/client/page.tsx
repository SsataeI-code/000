import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import {
  getClientProfile,
  getFoodPhotoUrls,
  getLatestTargets,
  getSavedMeals,
  getTodayFoodLogs,
  isOnboarded,
  totalMacros,
} from "@/lib/nutrition/data";
import { DayProgress } from "@/components/nutrition/DayProgress";
import { FoodLogList } from "@/components/nutrition/FoodLogList";
import { MicroTracker } from "@/components/nutrition/MicroTracker";
import { FillYourRings } from "@/components/nutrition/FillYourRings";
import { MealSuggestions } from "@/components/nutrition/MealSuggestions";
import { SavedMealsList } from "@/components/nutrition/SavedMealsList";
import { ReviewNudges } from "@/components/nutrition/ReviewNudges";
import { TodayHabits, type TodayHabitItem } from "@/components/habits/TodayHabits";
import { HabitGame } from "@/components/habits/HabitGame";
import { Greeting } from "@/components/client/Greeting";
import { WaterTracker } from "@/components/body/WaterTracker";
import { getHabits, getHabitLogs, completedDatesByHabit } from "@/lib/habits/data";
import { getTodayWaterMl } from "@/lib/body/data";
import { currentStreak, isStreakFrozen, isDueToday, isoDate, FREEZE_BUDGET } from "@/lib/habits/streaks";
import { habitGameStats, computeGameState } from "@/lib/habits/game";
import { sumMicros } from "@/lib/nutrition/micros";
import { suggestFills } from "@/lib/nutrition/recommend";
import { suggestMeals, shortMicroKeys } from "@/lib/nutrition/meals";
import { getCopy } from "@/lib/content/copy";

export const dynamic = "force-dynamic";

/**
 * Client "Today" screen (§5). Phase 1 hierarchy: progress rings (the reward
 * filling up), then food logging. Habits move to the top in Phase 2.
 */
export default async function TodayPage() {
  if (!hasSupabaseConfig()) redirect("/");

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [profile, targets] = await Promise.all([
    getClientProfile(user.id),
    getLatestTargets(user.id),
  ]);

  // No targets yet → first-run intake so the rings mean something.
  if (!isOnboarded(profile, targets) || !targets) {
    redirect("/client/onboarding");
  }

  const [logs, savedMeals, habits, habitLogs, waterMl] = await Promise.all([
    getTodayFoodLogs(user.id),
    getSavedMeals(user.id),
    getHabits(user.id),
    getHabitLogs(user.id),
    getTodayWaterMl(user.id),
  ]);
  const totals = totalMacros(logs);
  const photoUrls = await getFoodPhotoUrls(logs);

  // Weekly / monthly review nudges.
  const daysSince = (iso: string | null | undefined) =>
    iso ? (Date.now() - new Date(iso).getTime()) / 86_400_000 : Infinity;
  const lastHabitUpdate = habits.reduce((max, h) => (h.updated_at > max ? h.updated_at : max), "");
  const showWeeklyReview = habits.length > 0 && daysSince(lastHabitUpdate) >= 7;
  const showRecalc = daysSince(targets.computed_at) >= 35;

  // Today's habits (the star) — those due today, with streaks.
  const byHabit = completedDatesByHabit(habitLogs);
  const now = new Date();
  const todayStr = isoDate(now);
  const todayValueByHabit = new Map<string, number>();
  for (const log of habitLogs) {
    if (log.log_date === todayStr) todayValueByHabit.set(log.habit_id, Number(log.value) || 0);
  }
  const habitItems: TodayHabitItem[] = habits
    .filter((h) => isDueToday(h, byHabit.get(h.id) ?? new Set<string>(), now))
    .map((h) => {
      const done = byHabit.get(h.id) ?? new Set<string>();
      return {
        id: h.id,
        name: h.name,
        category: h.category,
        type: h.type,
        target: h.target,
        unit: h.unit,
        todayValue: todayValueByHabit.get(h.id) ?? 0,
        doneToday: done.has(todayStr),
        streak: currentStreak(h, done, now, FREEZE_BUDGET),
        frozen: isStreakFrozen(h, done, now),
        why: h.why,
      };
    });
  const name = user.profile?.display_name?.split(" ")[0];

  // Habit game state — points, level, streaks, badges (§5A the star; §4 celebrate).
  const totalCompletions = habitLogs.filter((l) => l.completed).length;
  const bestCurrentStreak = habits.reduce(
    (m, h) => Math.max(m, currentStreak(h, byHabit.get(h.id) ?? new Set<string>(), now, FREEZE_BUDGET)),
    0,
  );
  const todayDone = habitItems.filter((i) => i.doneToday).length;
  const gameStats = habitGameStats({
    habits,
    completedByHabit: byHabit,
    totalCompletions,
    bestCurrentStreak,
    todayDone,
    todayDue: habitItems.length,
  });
  const gameState = computeGameState(gameStats);

  // "Fill your rings" suggestions from what's still short today.
  const microTotals = sumMicros(logs);
  const fiberGoal = Math.round((14 * targets.calories) / 1000);
  const remainingProteinG = targets.protein_g - totals.proteinG;
  const remainingFiberG = fiberGoal - (microTotals.fiber ?? 0);
  const suggestions = suggestFills({
    remainingProteinG,
    remainingFiberG,
    microTotalsGrams: microTotals,
    calories: targets.calories,
    sex: profile?.sex ?? null,
  });
  const meals = suggestMeals({
    remainingProteinG,
    remainingFiberG,
    remainingCalories: targets.calories - totals.calories,
    shortMicroKeys: shortMicroKeys(microTotals, targets.calories, profile?.sex ?? null),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">
          {getCopy("client.today.title")}
        </p>
        <Greeting name={name} fallback={name ? `Hi, ${name}.` : getCopy("client.today.greeting")} />
      </div>

      <ReviewNudges showWeeklyReview={showWeeklyReview} showRecalc={showRecalc} />

      {habits.length > 0 ? (
        <HabitGame
          state={gameState}
          todayDone={todayDone}
          todayDue={habitItems.length}
          bestStreak={gameStats.bestStreak}
          currentStreak={bestCurrentStreak}
        />
      ) : null}

      <TodayHabits items={habitItems} />

      <DayProgress
        totals={totals}
        targets={{
          calories: targets.calories,
          proteinG: targets.protein_g,
          carbsG: targets.carbs_g,
          fatG: targets.fat_g,
        }}
      />

      <WaterTracker consumedMl={waterMl} goalMl={profile?.water_goal_ml ?? 2500} />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl text-ink">{getCopy("client.nav.food")}</h2>
        <Link
          href="/client/food"
          className="inline-flex min-h-tap items-center bg-red px-4 py-2 font-label text-xs font-600 uppercase tracking-wide text-surface hover:bg-red-ink"
        >
          Add food
        </Link>
      </div>

      <FillYourRings suggestions={suggestions} />

      <section aria-label="Your meals" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl text-ink">Your meals</h2>
          <Link
            href="/client/meals"
            className="min-h-tap font-label text-xs uppercase tracking-wide text-red underline underline-offset-4"
          >
            Build a meal
          </Link>
        </div>
        {savedMeals.length > 0 ? (
          <SavedMealsList meals={savedMeals} showDelete={false} />
        ) : (
          <p className="font-body text-sm text-ink/60">
            Save your go-to meals to log them in one tap. Tap “Build a meal”.
          </p>
        )}
      </section>

      <MealSuggestions meals={meals} />

      <FoodLogList logs={logs} photoUrls={photoUrls} />

      <MicroTracker logs={logs} calories={targets.calories} sex={profile?.sex ?? null} />
    </div>
  );
}
