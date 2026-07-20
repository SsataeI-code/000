import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getSavedMeals } from "@/lib/nutrition/data";
import { MealBuilder } from "@/components/nutrition/MealBuilder";
import { SavedMealsList } from "@/components/nutrition/SavedMealsList";

export const dynamic = "force-dynamic";

/** Build & manage saved meals (§5B). Create your own, log them in one tap later. */
export default async function MealsPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const meals = await getSavedMeals(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl text-ink">Your meals</h1>
        <Link
          href="/client"
          className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red"
        >
          Done
        </Link>
      </div>

      <div>
        <h2 className="mb-3 text-2xl text-ink">Build a meal</h2>
        <MealBuilder />
      </div>

      {meals.length > 0 ? (
        <div>
          <h2 className="mb-3 text-2xl text-ink">Saved</h2>
          <SavedMealsList meals={meals} />
        </div>
      ) : null}
    </div>
  );
}
