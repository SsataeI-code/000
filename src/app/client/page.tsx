import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getCopy } from "@/lib/content/copy";

/**
 * Client "Today" shell (§5). The living daily screen — habits, then rings, then
 * food — lands in Phase 1. Phase 0 stands up the frame so the loop is real:
 * a signed-in client reaches their own private, role-correct home.
 */
export default async function TodayPage() {
  // Pages render in parallel with their layout, so this guard must live here
  // too — never touch Supabase before confirming it's configured.
  if (!hasSupabaseConfig()) redirect("/");

  const user = await getSessionUser();
  const name = user?.profile?.display_name?.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">
          {getCopy("client.today.title")}
        </p>
        <h1 className="mt-1 text-4xl text-ink">
          {name ? `Hi, ${name}.` : getCopy("client.today.greeting")}
        </h1>
      </div>

      <section
        aria-label={getCopy("client.nav.habits")}
        className="border border-hairline bg-surface p-5"
      >
        <p className="font-body text-ink/70">{getCopy("client.today.empty")}</p>
      </section>

      <p className="font-label text-xs uppercase tracking-wide text-ink/40">
        Phase 1 brings habits, rings, and food logging here.
      </p>
    </div>
  );
}
