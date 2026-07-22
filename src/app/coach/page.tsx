import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getRoster, getRosterSeries, getDashboardLayout, type RosterClient } from "@/lib/coach/data";
import { visibleTiles, type TileId } from "@/lib/coach/dashboard";
import { getCopy } from "@/lib/content/copy";
import { resolveRange } from "@/lib/charts/range";
import { RangeToggle } from "@/components/charts/RangeToggle";
import { RosterTrends, type WeightSplit } from "@/components/charts/RosterTrends";

export const dynamic = "force-dynamic";

const GOAL_LABEL: Record<string, string> = {
  lose: "Fat loss", gain: "Muscle gain", maintain: "Maintain", recomp: "Recomp", habits_only: "Habits",
};
const WEIGHT_THRESHOLD_KG = 0.3;

/** Coach command center — configurable tiles, opens on Needs-Attention (§9). */
export default async function CoachDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: coach } = await supabase.from("coaches").select("coach_code").eq("id", user.id).maybeSingle();

  const [roster, layout] = await Promise.all([getRoster(user.id), getDashboardLayout(user.id)]);

  // Empty roster: a focused onboarding card, no tiles to fill yet.
  if (roster.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-4xl text-ink">No clients yet</h1>
        <section className="border border-hairline bg-surface p-5">
          <p className="font-body text-ink/70">{getCopy("coach.dashboard.empty")}</p>
          {coach?.coach_code ? (
            <p className="mt-3 font-body text-sm text-ink/60">
              Your code: <span className="font-display text-xl uppercase tracking-widest text-red">{coach.coach_code}</span>
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  const needsAttention = roster.filter((c) => c.flags.length > 0);
  const steady = roster.filter((c) => c.flags.length === 0);
  const tiles = visibleTiles(layout);

  // Roster-trends is heavy, so only fetch its series when the tile is on.
  const range = await resolveRange((await searchParams).range);
  let series = null;
  let weightSplit: WeightSplit | null = null;
  if (tiles.includes("roster_trends")) {
    series = await getRosterSeries(user.id, range);
    const tracked = roster.filter((c) => c.lastWeightKg != null);
    weightSplit = {
      losing: tracked.filter((c) => c.weightChangeKg < -WEIGHT_THRESHOLD_KG).length,
      gaining: tracked.filter((c) => c.weightChangeKg > WEIGHT_THRESHOLD_KG).length,
      holding: tracked.filter((c) => Math.abs(c.weightChangeKg) <= WEIGHT_THRESHOLD_KG).length,
      tracked: tracked.length,
    };
  }

  const renderTile = (id: TileId) => {
    switch (id) {
      case "snapshot":
        return (
          <section key={id} className="grid grid-cols-3 gap-3">
            <Stat label="Clients" value={String(roster.length)} />
            <Stat label="Active today" value={String(roster.filter((c) => c.daysSinceActivity === 0).length)} />
            <Stat label="Need attention" value={String(needsAttention.length)} />
          </section>
        );
      case "needs_attention":
        return needsAttention.length > 0 ? (
          <ul key={id} className="flex flex-col gap-3">
            {needsAttention.map((c) => <ClientCard key={c.id} client={c} />)}
          </ul>
        ) : (
          <p key={id} className="border border-hairline bg-surface p-4 font-body text-sm text-ink/50">Nobody&apos;s flagged right now — nice.</p>
        );
      case "steady":
        return steady.length > 0 ? (
          <section key={id} className="flex flex-col gap-3">
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
        ) : null;
      case "roster_trends":
        return series && weightSplit ? (
          <RosterTrends key={id} series={series} days={range} weightSplit={weightSplit} toggle={<RangeToggle current={range} />} />
        ) : null;
      case "coach_code":
        return coach?.coach_code ? (
          <section key={id} className="border border-hairline bg-surface p-5">
            <p className="font-label text-xs uppercase tracking-wide text-ink/50">Your coach code</p>
            <p className="mt-2 font-display text-3xl uppercase tracking-widest text-red">{coach.coach_code}</p>
            <p className="mt-2 font-body text-sm text-ink/60">Share it to bring in your next client.</p>
          </section>
        ) : null;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">{getCopy("coach.dashboard.needsAttention")}</p>
          <h1 className="mt-1 text-4xl text-ink">
            {needsAttention.length === 0 ? "All steady" : `${needsAttention.length} need${needsAttention.length === 1 ? "s" : ""} you`}
          </h1>
        </div>
        <Link href="/coach/dashboard" className="min-h-tap shrink-0 font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Customize
        </Link>
      </div>

      {tiles.map(renderTile)}
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

function ClientCard({ client }: { client: RosterClient }) {
  return (
    <li>
      <Link href={`/coach/clients/${client.id}`} className="block border-l-4 border-red bg-surface p-4 hover:bg-surface-muted">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xl text-ink">{client.name}</span>
          <span className="shrink-0 font-label text-[10px] uppercase tracking-wide text-ink/40">{GOAL_LABEL[client.goal]}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {client.flags.map((f) => (
            <span key={f.kind} className="border border-red px-2 py-0.5 font-label text-[10px] uppercase tracking-wide text-red-ink">{f.label}</span>
          ))}
        </div>
      </Link>
    </li>
  );
}
