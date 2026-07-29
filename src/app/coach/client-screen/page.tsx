import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getClientScreenLayout } from "@/lib/coach/data";
import { ClientScreenEditor } from "@/components/coach/ClientScreenEditor";

export const dynamic = "force-dynamic";

/** Coach/owner arranges what their clients see on the Today screen (§4). */
export default async function ClientScreenPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "client") redirect("/client");

  const layout = await getClientScreenLayout(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Customize</p>
          <h1 className="mt-1 text-4xl text-ink">Client screen</h1>
        </div>
        <Link
          href="/coach"
          className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red"
        >
          Dashboard
        </Link>
      </div>
      <p className="font-body text-sm text-ink/60">
        Arrange what your clients see on their Today screen — reorder the sections and hide any you don&apos;t
        want. Their greeting and review reminders always stay. Applies to every client.
      </p>

      <ClientScreenEditor initial={layout} />
    </div>
  );
}
