import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function CoachYouPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: coach } = await supabase.from("coaches").select("coach_code").eq("id", user.id).maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-4xl text-ink">You</h1>

      {coach?.coach_code ? (
        <section className="border border-hairline bg-surface p-5">
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Your coach code</p>
          <p className="mt-2 font-display text-3xl uppercase tracking-widest text-red">{coach.coach_code}</p>
          <p className="mt-2 font-body text-sm text-ink/60">
            Share it, or send a sign-up link: <code className="bg-surface-muted px-1">/signup?coach={coach.coach_code}</code>
          </p>
        </section>
      ) : null}

      <section className="border border-hairline bg-surface p-5">
        <p className="font-body text-sm text-ink/70">{user.email}</p>
        {user.role === "owner" ? (
          <p className="mt-1 font-label text-[10px] uppercase tracking-wide text-red">Owner</p>
        ) : null}
        <div className="mt-3">
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
