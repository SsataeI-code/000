import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { coachHasClient, getClientScreenEditState } from "@/lib/coach/data";
import { ClientScreenOverrideEditor } from "@/components/coach/ClientScreenOverrideEditor";

export const dynamic = "force-dynamic";

/** Coach/owner tailors ONE client's Today screen (§4, individual-client grain). */
export default async function ClientScreenOverridePage({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "client") redirect("/client");
  const { id } = await params;
  if (user.role !== "owner" && !(await coachHasClient(user.id, id))) notFound();

  const supabase = await createClient();
  const { data: nameRow } = await supabase.from("profiles").select("display_name").eq("id", id).maybeSingle();
  const name = nameRow?.display_name ?? "This client";

  const { layout, overridden } = await getClientScreenEditState(id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Customize · {name}</p>
          <h1 className="mt-1 text-4xl text-ink">Their screen</h1>
        </div>
        <Link
          href={`/coach/clients/${id}`}
          className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red"
        >
          Back
        </Link>
      </div>
      <p className="font-body text-sm text-ink/60">
        Reorder or hide sections just for {name}. This overrides your{" "}
        <Link href="/coach/client-screen" className="text-red underline underline-offset-4">
          roster-wide default
        </Link>
        ; reset any time to follow it again. Their greeting and review reminders always stay.
      </p>

      <ClientScreenOverrideEditor clientId={id} clientName={name} initial={layout} overridden={overridden} />
    </div>
  );
}
