import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getRoster } from "@/lib/coach/data";

export const dynamic = "force-dynamic";

const GOAL_LABEL: Record<string, string> = {
  lose: "Fat loss", gain: "Muscle gain", maintain: "Maintain", recomp: "Recomp", habits_only: "Habits",
};

/** Full roster with simple aggregates (§9 — deeper cohort slicing comes next). */
export default async function RosterPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const roster = await getRoster(user.id);
  const activeToday = roster.filter((c) => c.daysSinceActivity === 0).length;
  const flagged = roster.filter((c) => c.flags.length > 0).length;
  const goalCounts = roster.reduce<Record<string, number>>((acc, c) => {
    acc[c.goal] = (acc[c.goal] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-4xl text-ink">Roster</h1>

      {roster.length === 0 ? (
        <p className="border border-hairline bg-surface p-5 font-body text-sm text-ink/60">
          No clients yet. Share your coach code to bring your first one in.
        </p>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-3">
            <Stat label="Clients" value={String(roster.length)} />
            <Stat label="Active today" value={String(activeToday)} />
            <Stat label="Need attention" value={String(flagged)} />
          </section>

          <section className="border border-hairline bg-surface p-4">
            <p className="font-label text-xs uppercase tracking-wide text-ink/50">By goal</p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
              {Object.entries(goalCounts).map(([g, n]) => (
                <span key={g} className="font-body text-sm text-ink/70">{GOAL_LABEL[g] ?? g}: {n}</span>
              ))}
            </div>
          </section>

          <ul className="flex flex-col divide-y divide-hairline border border-hairline bg-surface">
            {roster.map((c) => (
              <li key={c.id}>
                <Link href={`/coach/clients/${c.id}`} className="flex min-h-tap items-center justify-between gap-3 px-4 py-3 hover:bg-surface-muted">
                  <span className="min-w-0">
                    <span className="block truncate font-body text-base text-ink">{c.name}</span>
                    <span className="block font-body text-xs text-ink/50">
                      {GOAL_LABEL[c.goal]} · active {c.daysSinceActivity === 0 ? "today" : `${c.daysSinceActivity}d ago`}
                    </span>
                  </span>
                  {c.flags.length > 0 ? (
                    <span className="shrink-0 font-label text-[10px] uppercase tracking-wide text-red">{c.flags.length} flag{c.flags.length === 1 ? "" : "s"}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-hairline bg-surface p-4 text-center">
      <p className="font-display text-3xl text-ink">{value}</p>
      <p className="font-label text-[10px] uppercase tracking-wide text-ink/50">{label}</p>
    </div>
  );
}
