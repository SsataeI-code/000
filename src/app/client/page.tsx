import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import {
  getClientProfile,
  getLatestTargets,
  getTodayFoodLogs,
  isOnboarded,
  totalMacros,
} from "@/lib/nutrition/data";
import { DayProgress } from "@/components/nutrition/DayProgress";
import { FoodLogList } from "@/components/nutrition/FoodLogList";
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

  const logs = await getTodayFoodLogs(user.id);
  const totals = totalMacros(logs);
  const name = user.profile?.display_name?.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">
          {getCopy("client.today.title")}
        </p>
        <h1 className="mt-1 text-4xl text-ink">
          {name ? `Hi, ${name}.` : getCopy("client.today.greeting")}
        </h1>
      </div>

      <DayProgress
        totals={totals}
        targets={{
          calories: targets.calories,
          proteinG: targets.protein_g,
          carbsG: targets.carbs_g,
          fatG: targets.fat_g,
        }}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl text-ink">{getCopy("client.nav.food")}</h2>
        <Link
          href="/client/food"
          className="inline-flex min-h-tap items-center bg-red px-4 py-2 font-label text-xs font-600 uppercase tracking-wide text-surface hover:bg-red-ink"
        >
          Add food
        </Link>
      </div>

      <FoodLogList logs={logs} />
    </div>
  );
}
