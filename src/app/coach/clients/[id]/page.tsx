import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { coachHasClient } from "@/lib/coach/data";
import {
  getClientProfile,
  getLatestTargets,
  getTodayFoodLogs,
  getFoodLogsSince,
  totalMacros,
} from "@/lib/nutrition/data";
import { getHabits, getHabitLogs, completedDatesByHabit } from "@/lib/habits/data";
import { consistency, currentStreak, isDueToday, isoDate, FREEZE_BUDGET } from "@/lib/habits/streaks";
import { habitGameStats, computeGameState } from "@/lib/habits/game";
import { getLoggingXpCounts } from "@/lib/habits/logging-xp";
import { getBodyMeasurements, getTodayWaterMl, getBodyPhotos } from "@/lib/body/data";
import { getWearableDaily } from "@/lib/wearables/data";
import { getLifts } from "@/lib/lifts/data";
import { LiftTracker } from "@/components/lifts/LiftTracker";
import { BodyPhotos } from "@/components/body/BodyPhotos";
import { WearableSummary } from "@/components/coach/WearableSummary";
import { getJournalEntries } from "@/lib/journal/data";
import { Journal } from "@/components/journal/Journal";
import { weightTrend, trendChangeKg, kgToLb } from "@/lib/body/trend";
import { DayProgress } from "@/components/nutrition/DayProgress";
import { HabitHeatmap } from "@/components/habits/HabitHeatmap";
import { HabitGame } from "@/components/habits/HabitGame";
import { Achievements } from "@/components/habits/Achievements";
import { ClientPlanTools } from "@/components/coach/ClientPlanTools";
import { MealRecommender } from "@/components/coach/MealRecommender";
import { RemoveClient } from "@/components/coach/RemoveClient";
import { IndividualProgress } from "@/components/charts/IndividualProgress";
import { RangeToggle } from "@/components/charts/RangeToggle";
import { ViewToggle } from "@/components/charts/ViewToggle";
import { resolveRange, resolveView } from "@/lib/charts/range";

export const dynamic = "force-dynamic";

const GOAL_LABEL: Record<string, string> = {
  lose: "Fat loss", gain: "Muscle gain", maintain: "Maintain", recomp: "Recomp", habits_only: "Habits",
};

export default async function ClientDeepDive({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string; view?: string }>;
}) {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;
  const range = await resolveRange(sp.range);
  const view = await resolveView(sp.view);

  // Authorization: the coach must coach this client (owner sees everyone).
  if (user.role !== "owner" && !(await coachHasClient(user.id, id))) notFound();

  const supabase = await createClient();
  const { data: nameRow } = await supabase.from("profiles").select("display_name").eq("id", id).maybeSingle();
  const name = nameRow?.display_name ?? "Client";

  const [profile, targets, logs, foodHistory, habits, habitLogs, body, waterMl, photos, lifts] = await Promise.all([
    getClientProfile(id),
    getLatestTargets(id),
    getTodayFoodLogs(id),
    getFoodLogsSince(id, range),
    getHabits(id),
    getHabitLogs(id),
    getBodyMeasurements(id),
    getTodayWaterMl(id),
    getBodyPhotos(id),
    getLifts(id, 180),
  ]);
  const wearableDays = await getWearableDaily(id, 7);
  const journal = await getJournalEntries(id, 30);

  const totals = totalMacros(logs);
  const byHabit = completedDatesByHabit(habitLogs);
  const today = new Date();
  const counts: Record<string, number> = {};
  for (const l of habitLogs) if (l.completed) counts[l.log_date] = (counts[l.log_date] ?? 0) + 1;
  const trend = weightTrend(body);
  const latestWeight = trend[trend.length - 1];

  // Vitals at a glance — height, current vs. starting weight, net progress.
  const startKg = profile?.weight_kg ?? null;
  const currentKg = latestWeight?.avgKg ?? startKg;
  const netChangeKg = startKg != null && currentKg != null ? currentKg - startKg : null;

  // The same habit game the client sees — so the owner/coach sees all of it too.
  const todayStr = isoDate(today);
  const loggingXp = await getLoggingXpCounts(id, todayStr);
  const dueToday = habits.filter((h) => isDueToday(h, byHabit.get(h.id) ?? new Set<string>(), today));
  const gameStats = habitGameStats({
    habits,
    completedByHabit: byHabit,
    totalCompletions: habitLogs.filter((l) => l.completed).length,
    bestCurrentStreak: habits.reduce((m, h) => Math.max(m, currentStreak(h, byHabit.get(h.id) ?? new Set<string>(), today, FREEZE_BUDGET)), 0),
    todayDone: dueToday.filter((h) => (byHabit.get(h.id) ?? new Set<string>()).has(todayStr)).length,
    todayDue: dueToday.length,
    foodLogs: loggingXp.foodLogs,
    hydrationDays: loggingXp.hydrationDays,
    todayFoodLogs: loggingXp.todayFoodLogs,
    hydratedToday: loggingXp.hydratedToday,
  });
  const gameState = computeGameState(gameStats);
  const firstName = name.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Client</p>
          <h1 className="mt-1 text-4xl text-ink">{name}</h1>
        </div>
        <Link href="/coach" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Back
        </Link>
      </div>

      <p className="font-body text-sm text-ink/60">
        Goal: {GOAL_LABEL[profile?.goal ?? "maintain"]}
        {profile?.diet_preference ? ` · ${profile.diet_preference.replace("_", " ")}` : ""}
        {profile?.sex ? ` · ${profile.sex}` : ""}
        {profile?.age ? ` · ${profile.age}y` : ""}
      </p>

      {/* Vitals — height, weight, and progress at a glance */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Vital label="Height" value={profile?.height_cm ? formatHeight(profile.height_cm) : "—"} />
        <Vital label="Current" value={currentKg != null ? `${kgToLb(currentKg)} lb` : "—"} />
        <Vital label="Start" value={startKg != null ? `${kgToLb(startKg)} lb` : "—"} />
        <Vital
          label="Net change"
          value={
            netChangeKg == null || Math.abs(netChangeKg) < 0.05
              ? "—"
              : `${netChangeKg < 0 ? "↓" : "↑"} ${Math.abs(kgToLb(Math.abs(netChangeKg)))} lb`
          }
        />
      </section>

      {/* Nutrition today */}
      {targets ? (
        <div>
          <h2 className="mb-3 text-2xl text-ink">Today&apos;s nutrition</h2>
          <DayProgress
            totals={totals}
            targets={{ calories: targets.calories, proteinG: targets.protein_g, carbsG: targets.carbs_g, fatG: targets.fat_g }}
          />
          <div className="mt-4">
            <MealRecommender
              clientId={id}
              clientName={name}
              remainingCalories={Math.max(0, targets.calories - totals.calories)}
              remainingProtein={Math.max(0, targets.protein_g - totals.proteinG)}
            />
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-hairline bg-surface shadow-card p-5 font-body text-sm text-ink/60">No targets set yet.</p>
      )}

      {/* Water */}
      <section className="rounded-2xl border border-hairline bg-surface shadow-card p-4">
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Water today</p>
        <p className="mt-1 font-body text-ink/80">
          {Math.round(waterMl / 29.5735)} / {Math.round((profile?.water_goal_ml ?? 2500) / 29.5735)} oz
        </p>
      </section>

      {/* Habits */}
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl text-ink">Habits</h2>
        {habits.length === 0 ? (
          <p className="rounded-2xl border border-hairline bg-surface shadow-card p-5 font-body text-sm text-ink/60">No habits yet.</p>
        ) : (
          <>
            <HabitGame
              state={gameState}
              todayDone={gameStats.todayDone}
              todayDue={gameStats.todayDue}
              bestStreak={gameStats.bestStreak}
              currentStreak={gameStats.bestCurrentStreak}
              coachView
              name={firstName}
            />
            <Achievements achievements={gameState.achievements} />
            <section className="rounded-2xl border border-hairline bg-surface shadow-card p-5">
              <HabitHeatmap counts={counts} max={Math.max(1, habits.length)} />
            </section>
            <ul className="flex flex-col divide-y divide-hairline rounded-2xl border border-hairline bg-surface shadow-card">
              {habits.map((h) => {
                const done = byHabit.get(h.id) ?? new Set<string>();
                return (
                  <li key={h.id} className="flex items-center justify-between px-4 py-3">
                    <span className="font-body text-base text-ink">{h.name}</span>
                    <span className="font-body text-xs text-ink/50">
                      {currentStreak(h, done, today, FREEZE_BUDGET)}d streak · {Math.round(consistency(h, done, today) * 100)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Weight */}
      <section className="rounded-2xl border border-hairline bg-surface shadow-card p-5">
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Weight</p>
        {latestWeight ? (
          <>
            <p className="mt-1 font-display text-3xl text-ink">{kgToLb(latestWeight.avgKg)} lb</p>
            {trend.length > 1 ? (
              <p className="mt-1 font-body text-sm text-ink/60">
                {trendChangeKg(trend) === 0
                  ? "Holding steady"
                  : `${trendChangeKg(trend) < 0 ? "↓" : "↑"} ${Math.abs(kgToLb(Math.abs(trendChangeKg(trend))))} lb tracked`}
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-1 font-body text-sm text-ink/60">No weight logged yet.</p>
        )}
      </section>

      {/* Stats & graphs — weight, food logging, protein, consistency */}
      <IndividualProgress
        measurements={body}
        foodLogs={foodHistory}
        habits={habits}
        habitLogs={habitLogs}
        targets={targets}
        goal={profile?.goal ?? null}
        view={view}
        days={range}
        toggle={<RangeToggle current={range} />}
        viewToggle={<ViewToggle current={view} />}
      />

      {wearableDays.length > 0 ? <WearableSummary days={wearableDays} /> : null}

      {lifts.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-2xl text-ink">Lifts</h2>
          <LiftTracker entries={lifts} readOnly />
        </section>
      ) : null}

      {photos.length > 0 ? <BodyPhotos photos={photos} canEdit={false} userId={id} /> : null}

      {/* Journal / food diary (read-only) */}
      {journal.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl text-ink">Journal</h2>
          <Journal entries={journal} canEdit={false} userId={id} />
        </div>
      ) : null}

      {/* Coach plan tools — adjust targets, assign / veto habits */}
      <ClientPlanTools
        clientId={id}
        targets={targets ? { calories: targets.calories, protein_g: targets.protein_g, carbs_g: targets.carbs_g, fat_g: targets.fat_g } : null}
        habits={habits}
        strictness={profile?.strictness ?? "precise"}
        goal={profile?.goal ?? "maintain"}
      />

      <Link
        href={`/coach/clients/${id}/screen`}
        className="flex items-center justify-between rounded-2xl border border-hairline bg-surface shadow-card p-4 hover:border-red"
      >
        <span className="min-w-0">
          <span className="block font-body text-base text-ink">Customize their Today screen</span>
          <span className="block font-body text-xs text-ink/50">Reorder or hide sections just for {name}</span>
        </span>
        <span aria-hidden className="shrink-0 font-label text-xs uppercase tracking-wide text-red">Edit →</span>
      </Link>

      <RemoveClient clientId={id} clientName={name} canDelete />
    </div>
  );
}

/** cm → a friendly ft'in" for the coach's US-facing view. */
function formatHeight(cm: number): string {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  return inch === 12 ? `${ft + 1}'0"` : `${ft}'${inch}"`;
}

function Vital({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface shadow-card p-3 text-center">
      <p className="font-display text-2xl text-ink">{value}</p>
      <p className="font-label text-[10px] uppercase tracking-wide text-ink/50">{label}</p>
    </div>
  );
}
