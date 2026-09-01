import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getRoster } from "@/lib/coach/data";
import { coachDigest, type DigestClient } from "@/lib/reports/weekly";

export const dynamic = "force-dynamic";

/** The coach's Monday digest (§12) — who moved, who slipped, who needs you. */
export default async function CoachReportPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "client") redirect("/client");

  const roster = await getRoster(user.id, { owner: user.role === "owner" });
  const clients: DigestClient[] = roster.map((c) => ({
    name: c.name,
    goal: c.goal,
    daysSinceActivity: c.daysSinceActivity,
    weightChangeLb: c.lastWeightKg == null ? null : Math.round(c.weightChangeKg * 2.20462 * 10) / 10,
    currentStreak: c.habitCurrentStreak,
    flags: c.flags,
  }));
  const digest = coachDigest(clients);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">This week</p>
          <h1 className="mt-1 text-4xl text-ink">Roster digest</h1>
        </div>
        <Link href="/coach" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Dashboard
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-hairline bg-surface shadow-card p-4">
          <p className="font-display text-4xl text-ink">{digest.total}</p>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Clients</p>
        </div>
        <div className="rounded-2xl border border-hairline bg-surface shadow-card p-4">
          <p className="font-display text-4xl text-ink">{digest.activeThisWeek}</p>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Active this week</p>
        </div>
      </section>

      <section aria-label="Wins to celebrate" className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface shadow-card p-5">
        <h2 className="font-label text-xs uppercase tracking-wide text-success">Celebrate</h2>
        {digest.celebrate.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {digest.celebrate.map((c, i) => (
              <li key={i} className="flex items-start gap-2 font-body text-base text-ink">
                <span aria-hidden className="mt-1 h-2 w-2 shrink-0 bg-success" />
                {c}
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-body text-sm text-ink/50">No standout wins logged this week yet.</p>
        )}
      </section>

      <section aria-label="Who needs you" className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface shadow-card p-5">
        <h2 className="font-label text-xs uppercase tracking-wide text-red-ink">Needs you Monday</h2>
        {digest.needsYou.length > 0 ? (
          <ul className="flex flex-col divide-y divide-hairline">
            {digest.needsYou.map((n, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <span className="font-body text-base text-ink">{n.name}</span>
                <span className="font-label text-[10px] uppercase tracking-wide text-ink/50">{n.reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-body text-sm text-ink/50">Everyone&apos;s on track. Enjoy the quiet.</p>
        )}
      </section>
    </div>
  );
}
