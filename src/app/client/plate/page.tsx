import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getLatestTargets, getClientProfile } from "@/lib/nutrition/data";
import { isDietPattern, parseAvoid, type DietFilter } from "@/lib/food/diet";
import { PlateBuilder } from "@/components/nutrition/PlateBuilder";

export const dynamic = "force-dynamic";

/** Plate builder — a teaching tool to learn and visualize a balanced plate. */
export default async function PlatePage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [targets, profile] = await Promise.all([getLatestTargets(user.id), getClientProfile(user.id)]);

  const diet: DietFilter = {
    pattern: isDietPattern(profile?.diet_pattern) ? profile.diet_pattern : "anything",
    avoid: parseAvoid(profile?.food_avoid),
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Learn</p>
          <h1 className="mt-1 text-4xl text-ink">Plate builder</h1>
        </div>
        <Link href="/client/food" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Done
        </Link>
      </div>

      <PlateBuilder targets={targets ? { calories: targets.calories, proteinG: targets.protein_g } : null} diet={diet} />
    </div>
  );
}
