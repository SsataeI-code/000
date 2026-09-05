import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getJournalEntries } from "@/lib/journal/data";
import { Journal } from "@/components/journal/Journal";

export const dynamic = "force-dynamic";

export default async function ClientJournalPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const entries = await getJournalEntries(user.id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Food & feelings</p>
          <h1 className="mt-1 text-4xl text-ink">Journal</h1>
        </div>
        <Link href="/client" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Done
        </Link>
      </div>

      <Journal entries={entries} canEdit userId={user.id} />
    </div>
  );
}
