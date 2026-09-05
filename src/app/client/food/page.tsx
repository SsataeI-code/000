import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getLatestTargets, getClientProfile, getRecentFoodsToRelog } from "@/lib/nutrition/data";
import { AddFood } from "@/components/food/AddFood";
import { hasAiConfig } from "@/lib/ai/client";
import { HandPortions } from "@/components/nutrition/HandPortions";
import { FoodPreferences } from "@/components/nutrition/FoodPreferences";
import { RecentFoods } from "@/components/nutrition/RecentFoods";

export const dynamic = "force-dynamic";

/** Add-food screen: scan a barcode (WASM) or enter it manually (§5, §6). */
export default async function AddFoodPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [targets, profile, recentFoods] = await Promise.all([
    getLatestTargets(user.id),
    getClientProfile(user.id),
    getRecentFoodsToRelog(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl text-ink">Add food</h1>
        <Link
          href="/client"
          className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red"
        >
          Done
        </Link>
      </div>
      <AddFood userId={user.id} aiEnabled={hasAiConfig()} />

      <RecentFoods foods={recentFoods} />

      <Link
        href="/client/plate"
        className="flex items-center justify-between rounded-lg border border-hairline bg-surface p-4 hover:border-red"
      >
        <span className="min-w-0">
          <span className="block font-body text-base text-ink">Build a plate</span>
          <span className="block font-body text-xs text-ink/50">See what a balanced meal looks like — tap portions, no weighing</span>
        </span>
        <span aria-hidden className="shrink-0 font-label text-xs uppercase tracking-wide text-red">Open →</span>
      </Link>

      <FoodPreferences pattern={profile?.diet_pattern ?? "anything"} avoid={profile?.food_avoid ?? ""} />

      {targets ? (
        <HandPortions targets={{ proteinG: targets.protein_g, carbsG: targets.carbs_g, fatG: targets.fat_g }} />
      ) : null}
    </div>
  );
}
