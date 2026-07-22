import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function CoachMessagesPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-4xl text-ink">Messages</h1>
      <p className="border border-hairline bg-surface p-5 font-body text-ink/70">
        Coach ↔ client chat and nudges arrive in Phase 4. For now, the Needs-Attention
        queue tells you who to reach out to.
      </p>
    </div>
  );
}
