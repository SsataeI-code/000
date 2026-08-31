import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import {
  getClientProfile,
  getFoodPhotoUrls,
  getLatestTargets,
  getRecentFoodNames,
  getRecentFoodsToRelog,
  getSavedMeals,
  getTodayFoodLogs,
  isOnboarded,
  totalMacros,
} from "@/lib/nutrition/data";
import { isDietPattern, parseAvoid, type DietFilter } from "@/lib/food/diet";
import { DayProgress } from "@/components/nutrition/DayProgress";
import { FoodLogList } from "@/components/nutrition/FoodLogList";
import { RecentFoods } from "@/components/nutrition/RecentFoods";
import { MicroTracker } from "@/components/nutrition/MicroTracker";
import { FillYourRings } from "@/components/nutrition/FillYourRings";
import { MealSuggestions } from "@/components/nutrition/MealSuggestions";
import { SavedMealsList } from "@/components/nutrition/SavedMealsList";
import { ReviewNudges } from "@/components/nutrition/ReviewNudges";
import { TodayHabits, type TodayHabitItem } from "@/components/habits/TodayHabits";
import { HabitGame } from "@/components/habits/HabitGame";
import { Greeting } from "@/components/client/Greeting";
import { WaterTracker } from "@/components/body/WaterTracker";
import { WeeklyWeighIn } from "@/components/body/WeeklyWeighIn";
import { getHabits, getHabitLogs, completedDatesByHabit } from "@/lib/habits/data";
import { getTodayWaterMl, getBodyMeasurements } from "@/lib/body/data";
import { currentStreak, isStreakFrozen, isDueToday, FREEZE_BUDGET } from "@/lib/habits/streaks";
import { dayInTimeZone } from "@/lib/time/day";
import { habitGameStats, computeGameState } from "@/lib/habits/game";
import { sumMicros } from "@/lib/nutrition/micros";
import { suggestFills } from "@/lib/nutrition/recommend";
import { suggestMeals, shortMicroKeys } from "@/lib/nutrition/meals";
import { macroRange } from "@/lib/nutrition/strictness";
import { getCopyServer } from "@/lib/content/data";
import { getMyClientScreenLayout } from "@/lib/coach/data";
import { visibleSections, type ClientSectionId } from "@/lib/coach/client-screen";

export const dynamic = "force-dynamic";

/**
 * Client "Today" screen (§5). Phase 1 hierarchy: progress rings (the reward
 * filling up), then food logging. Habits move to the top in Phase 2.
 */
export default async function TodayPage() {
  if (!hasSupabaseConfig()) redirect("/");

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const t = await getCopyServer();
  const [profile, targets] = await Promise.all([
    getClientProfile(user.id),
    getLatestTargets(user.id),
  ]);

  // No targets yet → first-run intake so the rings mean something.
  if (!isOnboarded(profile, targets) || !targets) {
    redirect("/client/onboarding");
  }

  // The client's own calendar day — daily stats reset at their local midnight
  // (not the server's UTC midnight), so evening logs land on the right day (§2).
  const today = dayInTimeZone(profile?.timezone);

  const [logs, savedMeals, habits, habitLogs, waterMl, screenLayout, recentNames, measurements, relogFoods] = await Promise.all([
    getTodayFoodLogs(user.id, today),
    getSavedMeals(user.id),
    getHabits(user.id),
    getHabitLogs(user.id),
    getTodayWaterMl(user.id, today),
    getMyClientScreenLayout(),
    getRecentFoodNames(user.id),
    getBodyMeasurements(user.id, 60),
    getRecentFoodsToRelog(user.id, 30, 8),
  ]);

  // Weekly weigh-in state (surfaced on Today so weight is never hard to find).
  const weightRows = measurements.filter((m) => m.weight_kg != null);
  const latestWeight = weightRows[weightRows.length - 1] ?? null;
  const latestKg = latestWeight ? Number(latestWeight.weight_kg) : null;
  const daysSinceWeigh = latestWeight
    ? Math.floor((Date.now() - new Date(`${latestWeight.log_date}T00:00:00`).getTime()) / 86_400_000)
    : null;
  let weightChangeKg: number | null = null;
  if (latestWeight) {
    const latestTime = new Date(latestWeight.log_date).getTime();
    for (let i = weightRows.length - 2; i >= 0; i--) {
      if (latestTime - new Date(weightRows[i].log_date).getTime() >= 6.5 * 86_400_000) {
        weightChangeKg = Math.round((latestKg! - Number(weightRows[i].weight_kg)) * 10) / 10;
        break;
      }
    }
  }
  const sections = visibleSections(screenLayout);
  const strictness = profile?.strictness ?? "precise";
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
  // Anchor all habit day-math to the client's local day (noon UTC on that date
  // is DST-safe), so streaks / due-today / freezes agree with the reset above.
  const now = new Date(`${today}T12:00:00Z`);
  const todayStr = today;
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

  // "Fill your rings" suggestions from what's still short today — filtered to the
  // client's diet + preferences, and leaning on foods they've logged before.
  const microTotals = sumMicros(logs);
  const fiberGoal = Math.round((14 * targets.calories) / 1000);
  const remainingProteinG = targets.protein_g - totals.proteinG;
  const remainingFiberG = fiberGoal - (microTotals.fiber ?? 0);
  const diet: DietFilter = {
    pattern: isDietPattern(profile?.diet_pattern) ? profile.diet_pattern : "anything",
    avoid: parseAvoid(profile?.food_avoid),
  };
  const suggestions = suggestFills({
    remainingProteinG,
    remainingFiberG,
    microTotalsGrams: microTotals,
    calories: targets.calories,
    sex: profile?.sex ?? null,
    diet,
    recentNames,
  });
  const meals = suggestMeals({
    remainingProteinG,
    remainingFiberG,
    remainingCalories: targets.calories - totals.calories,
    shortMicroKeys: shortMicroKeys(microTotals, targets.calories, profile?.sex ?? null),
    diet,
  });

  // Each configurable Today section (§4 — the coach arranges these). The greeting
  // and review banners are structural and always render.
  const renderSection = (id: ClientSectionId) => {
    switch (id) {
      case "habits":
        return (
          <div key={id} className="flex flex-col gap-6">
            {habits.length > 0 ? (
              <HabitGame
                state={gameState}
                todayDone={todayDone}
                todayDue={habitItems.length}
                bestStreak={gameStats.bestStreak}
                currentStreak={bestCurrentStreak}
                badgesHref="/client/achievements"
              />
            ) : null}
            <TodayHabits items={habitItems} />
          </div>
        );
      case "rings":
        if (strictness === "habits_only") {
          return (
            <div key={id} className="rounded-lg border border-hairline bg-surface p-4">
              <p className="font-body text-sm text-ink/70">
                Habits-focused plan — no macro targets today. Keep your habits and water on track.
              </p>
            </div>
          );
        }
        return (
          <div key={id} className="flex flex-col gap-2">
            <DayProgress
              totals={totals}
              targets={{
                calories: targets.calories,
                proteinG: targets.protein_g,
                carbsG: targets.carbs_g,
                fatG: targets.fat_g,
              }}
            />
            {strictness === "flexible"
              ? (() => {
                  const cal = macroRange(targets.calories);
                  const pro = macroRange(targets.protein_g);
                  return (
                    <p className="font-body text-xs text-ink/50">
                      Ranges are fine — around {cal.low.toLocaleString()}–{cal.high.toLocaleString()} cal and {pro.low}–{pro.high}g protein.
                    </p>
                  );
                })()
              : null}
            {strictness === "protein_cals" ? (
              <p className="font-body text-xs text-ink/50">Focus on hitting protein and calories — carbs &amp; fat stay flexible.</p>
            ) : null}
          </div>
        );
      case "water":
        return <WaterTracker key={id} consumedMl={waterMl} goalMl={profile?.water_goal_ml ?? 2500} />;
      case "ask":
        return (
          <Link
            key={id}
            href="/client/assistant"
            className="flex items-center justify-between rounded-lg border border-hairline bg-surface p-4 hover:border-red"
          >
            <span className="min-w-0">
              <span className="block font-body text-base text-ink">Ask</span>
              <span className="block font-body text-xs text-ink/50">Quick answers from your numbers — calories, protein, water, habits</span>
            </span>
            <span aria-hidden className="shrink-0 font-label text-xs uppercase tracking-wide text-red">Ask →</span>
          </Link>
        );
      case "food":
        return (
          <div key={id} className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl text-ink">{t("client.nav.food")}</h2>
              <Link
                href="/client/food"
                className="inline-flex min-h-tap items-center rounded-xl bg-grad-red px-4 py-2 font-label text-xs font-600 uppercase tracking-wide text-white shadow-pop-red transition-transform active:translate-y-[3px] active:shadow-none"
              >
                Add food
              </Link>
            </div>
            <RecentFoods foods={relogFoods} />
            <FoodLogList logs={logs} photoUrls={photoUrls} />
          </div>
        );
      case "fill_rings":
        if (strictness === "habits_only") return null;
        return <FillYourRings key={id} suggestions={suggestions} />;
      case "meals":
        return (
          <div key={id} className="flex flex-col gap-6">
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
          </div>
        );
      case "micros":
        if (strictness === "habits_only") return null;
        return <MicroTracker key={id} logs={logs} calories={targets.calories} sex={profile?.sex ?? null} />;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">
          {t("client.today.title")}
        </p>
        <Greeting name={name} fallback={name ? `Hi, ${name}.` : t("client.today.greeting")} />
      </div>

      <ReviewNudges showWeeklyReview={showWeeklyReview} showRecalc={showRecalc} />

      <WeeklyWeighIn latestKg={latestKg} daysSince={daysSinceWeigh} changeKg={weightChangeKg} />

      {sections.map(renderSection)}
    </div>
  );
}
