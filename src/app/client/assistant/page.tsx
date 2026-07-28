import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { hasAiConfig } from "@/lib/ai/client";
import { buildHelpContext } from "@/lib/help/context";
import { AnswerHelper } from "@/components/help/AnswerHelper";
import { Assistant } from "@/components/ai/Assistant";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const ctx = await buildHelpContext(user.id, user.profile?.display_name ?? null);
  const aiOn = hasAiConfig();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Quick answers</p>
          <h1 className="mt-1 text-4xl text-ink">Ask</h1>
        </div>
        <Link href="/client" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Done
        </Link>
      </div>

      {/* Always-on, no-AI answer helper */}
      <AnswerHelper ctx={ctx} />

      {/* AI assistant — richer meal planning, only when a key is configured */}
      {aiOn ? (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-2xl text-ink">AI assistant</h2>
            <p className="mt-1 font-body text-sm text-ink/60">Meal plans and swaps, grounded in your day.</p>
          </div>
          <Assistant />
        </section>
      ) : null}
    </div>
  );
}
