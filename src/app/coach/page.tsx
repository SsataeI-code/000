import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getCopy } from "@/lib/content/copy";

/**
 * Coach command center shell (§9). The Needs-Attention queue, deep-dives, and
 * roster stats are Phase 3; Phase 0 stands up the frame and surfaces the coach's
 * shareable code so they can bring their first client in on day one.
 */
export default async function CoachDashboardPage() {
  // Pages render in parallel with their layout, so this guard must live here
  // too — never touch Supabase before confirming it's configured.
  if (!hasSupabaseConfig()) redirect("/");

  const user = await getSessionUser();
  const supabase = await createClient();

  // A coach's own code (owner is a coach too). RLS lets a coach read their row.
  const { data: coach } = await supabase
    .from("coaches")
    .select("coach_code")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  // Count of this coach's clients (RLS scopes rows to the caller automatically).
  const { count: clientCount } = await supabase
    .from("coach_clients")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">
          {getCopy("coach.dashboard.needsAttention")}
        </p>
        <h1 className="mt-1 text-4xl text-ink">
          {clientCount ? `${clientCount} in your roster` : "No one waiting"}
        </h1>
      </div>

      <section
        aria-label={getCopy("coach.dashboard.needsAttention")}
        className="border border-hairline bg-surface p-5"
      >
        <p className="font-body text-ink/70">
          {clientCount
            ? "Everyone's steady. The Needs-Attention queue fills in as clients log — that's Phase 3."
            : getCopy("coach.dashboard.empty")}
        </p>
      </section>

      {coach?.coach_code ? (
        <section className="border border-hairline bg-surface p-5">
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">
            {getCopy("coach.dashboard.yourCode")}
          </p>
          <p className="mt-2 font-display text-3xl uppercase tracking-widest text-red">
            {coach.coach_code}
          </p>
          <p className="mt-2 font-body text-sm text-ink/60">
            Share it, or send a link: <code className="bg-surface-muted px-1">/signup?coach={coach.coach_code}</code>
          </p>
        </section>
      ) : null}
    </div>
  );
}
