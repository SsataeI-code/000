import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { hasAiConfig } from "@/lib/ai/client";
import { Assistant } from "@/components/ai/Assistant";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Assistant</p>
          <h1 className="mt-1 text-4xl text-ink">Ask</h1>
        </div>
        <Link href="/client" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Done
        </Link>
      </div>

      {hasAiConfig() ? (
        <Assistant />
      ) : (
        <p className="border border-hairline bg-surface p-5 font-body text-sm text-ink/60">
          The AI assistant isn&apos;t switched on yet. Your coach can enable it — then meal ideas and swaps within your
          targets show up right here.
        </p>
      )}
    </div>
  );
}
