import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getLifts } from "@/lib/lifts/data";
import { LiftTracker } from "@/components/lifts/LiftTracker";

export const dynamic = "force-dynamic";

/** Lift tracker — a spreadsheet-style strength-progress log (owner decision). */
export default async function LiftsPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const entries = await getLifts(user.id, 365);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Training</p>
          <h1 className="mt-1 text-4xl text-ink">Lifts</h1>
        </div>
        <Link href="/client/body" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Done
        </Link>
      </div>

      <LiftTracker entries={entries} />
    </div>
  );
}
