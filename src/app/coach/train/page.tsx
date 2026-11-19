import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getRoster } from "@/lib/coach/data";

export const dynamic = "force-dynamic";

const GOAL_LABEL: Record<string, string> = {
  lose: "Fat loss", gain: "Muscle gain", maintain: "Maintain", recomp: "Recomp", habits_only: "Habits",
};

/** Coach Train hub — pick a client to log workouts and see their training. */
export default async function CoachTrainPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "client") redirect("/client");

  const roster = await getRoster(user.id, { owner: user.role === "owner" });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-4xl text-ink">Training</h1>
        <p className="mt-2 font-body text-sm text-ink/60">Pick a client to log a workout, record test numbers, and see their progress.</p>
      </div>

      {roster.length === 0 ? (
        <p className="rounded-2xl border border-hairline bg-surface shadow-card p-5 font-body text-sm text-ink/60">No clients yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline rounded-2xl border border-hairline bg-surface shadow-card">
          {roster.map((c) => (
            <li key={c.id}>
              <Link href={`/coach/clients/${c.id}/train`} className="flex min-h-tap items-center justify-between gap-3 px-4 py-3 hover:bg-surface-muted">
                <span className="min-w-0">
                  <span className="block truncate font-body text-base text-ink">{c.name}</span>
                  <span className="block font-body text-sm text-ink/50">{GOAL_LABEL[c.goal] ?? c.goal}</span>
                </span>
                <span aria-hidden className="shrink-0 font-label text-sm uppercase tracking-wide text-red">Open →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
