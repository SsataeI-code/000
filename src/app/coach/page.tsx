import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getRoster, type RosterClient } from "@/lib/coach/data";
import { getCopy } from "@/lib/content/copy";

export const dynamic = "force-dynamic";

const GOAL_LABEL: Record<string, string> = {
  lose: "Fat loss",
  gain: "Muscle gain",
  maintain: "Maintain",
  recomp: "Recomp",
  habits_only: "Habits",
};

/** Coach command center — opens on the Needs-Attention queue (§9). */
export default async function CoachDashboardPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: coach } = await supabase.from("coaches").select("coach_code").eq("id", user.id).maybeSingle();

  const roster = await getRoster(user.id);
  const needsAttention = roster.filter((c) => c.flags.length > 0);
  const steady = roster.filter((c) => c.flags.length === 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">
          {getCopy("coach.dashboard.needsAttention")}
        </p>
        <h1 className="mt-1 text-4xl text-ink">
          {roster.length === 0
            ? "No clients yet"
            : needsAttention.length === 0
              ? "All steady"
              : `${needsAttention.length} need${needsAttention.length === 1 ? "s" : ""} you`}
        </h1>
      </div>

      {roster.length === 0 ? (
        <section className="border border-hairline bg-surface p-5">
          <p className="font-body text-ink/70">{getCopy("coach.dashboard.empty")}</p>
          {coach?.coach_code ? (
            <p className="mt-3 font-body text-sm text-ink/60">
              Your code: <span className="font-display text-xl uppercase tracking-widest text-red">{coach.coach_code}</span>
            </p>
          ) : null}
        </section>
      ) : null}

      {needsAttention.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {needsAttention.map((c) => (
            <ClientCard key={c.id} client={c} />
          ))}
        </ul>
      ) : null}

      {steady.length > 0 ? (
        <section className="flex flex-col gap-3">
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Steady</p>
          <ul className="flex flex-col divide-y divide-hairline border border-hairline bg-surface">
            {steady.map((c) => (
              <li key={c.id}>
                <Link href={`/coach/clients/${c.id}`} className="flex min-h-tap items-center justify-between px-4 py-3 hover:bg-surface-muted">
                  <span className="font-body text-base text-ink">{c.name}</span>
                  <span className="font-body text-xs text-ink/50">
                    {GOAL_LABEL[c.goal]} · active {c.daysSinceActivity === 0 ? "today" : `${c.daysSinceActivity}d ago`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ClientCard({ client }: { client: RosterClient }) {
  return (
    <li>
      <Link href={`/coach/clients/${client.id}`} className="block border-l-4 border-red bg-surface p-4 hover:bg-surface-muted">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xl text-ink">{client.name}</span>
          <span className="shrink-0 font-label text-[10px] uppercase tracking-wide text-ink/40">
            {GOAL_LABEL[client.goal]}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {client.flags.map((f) => (
            <span key={f.kind} className="border border-red px-2 py-0.5 font-label text-[10px] uppercase tracking-wide text-red-ink">
              {f.label}
            </span>
          ))}
        </div>
      </Link>
    </li>
  );
}
