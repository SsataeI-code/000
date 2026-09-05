import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getBodyMeasurements, getBodyPhotos } from "@/lib/body/data";
import { BodyPhotos } from "@/components/body/BodyPhotos";
import { getFoodLogsSince, getLatestTargets, getClientProfile } from "@/lib/nutrition/data";
import { getHabits, getHabitLogs } from "@/lib/habits/data";
import { BodyLogForm } from "@/components/body/BodyLogForm";
import { IndividualProgress } from "@/components/charts/IndividualProgress";
import { RangeToggle } from "@/components/charts/RangeToggle";
import { resolveRange } from "@/lib/charts/range";

export const dynamic = "force-dynamic";

export default async function BodyPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const range = await resolveRange(sp.range);

  const [measurements, foodLogs, habits, habitLogs, targets, photos, profile] = await Promise.all([
    getBodyMeasurements(user.id),
    getFoodLogsSince(user.id, range),
    getHabits(user.id),
    getHabitLogs(user.id),
    getLatestTargets(user.id),
    getBodyPhotos(user.id),
    getClientProfile(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl text-ink">Progress</h1>
        <Link href="/client" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Done
        </Link>
      </div>

      <Link
        href="/client/lifts"
        className="flex items-center justify-between rounded-lg border border-hairline bg-surface p-4 hover:border-red"
      >
        <span className="min-w-0">
          <span className="block font-body text-base text-ink">Lifts</span>
          <span className="block font-body text-xs text-ink/50">Track your strength — log sets and watch your numbers climb</span>
        </span>
        <span aria-hidden className="shrink-0 font-label text-xs uppercase tracking-wide text-red">Open →</span>
      </Link>

      {/* Your graphs — weight, food logging, protein, consistency */}
      <IndividualProgress
        measurements={measurements}
        foodLogs={foodLogs}
        habits={habits}
        habitLogs={habitLogs}
        targets={targets}
        goal={profile?.goal ?? null}
        days={range}
        toggle={<RangeToggle current={range} />}
        clientView
      />

      <div>
        <h2 className="mb-3 text-2xl text-ink">Log</h2>
        <BodyLogForm />
      </div>

      <BodyPhotos photos={photos} canEdit userId={user.id} />
    </div>
  );
}
