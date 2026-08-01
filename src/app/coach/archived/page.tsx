import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getArchivedClients } from "@/lib/coach/data";
import { ArchivedClients } from "@/components/coach/ArchivedClients";

export const dynamic = "force-dynamic";

/** Archived clients — off the roster but recoverable (§13). Coach/owner only. */
export default async function ArchivedPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "client") redirect("/client");

  const clients = await getArchivedClients(user.id, { owner: user.role === "owner" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Roster</p>
          <h1 className="mt-1 text-4xl text-ink">Archived</h1>
        </div>
        <Link
          href="/coach/roster"
          className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red"
        >
          Roster
        </Link>
      </div>
      <p className="font-body text-sm text-ink/60">
        Clients you&apos;ve taken off your roster. Their history is kept — restore anyone to bring them back to your
        active roster, stats, and queues.
      </p>

      <ArchivedClients clients={clients} />
    </div>
  );
}
