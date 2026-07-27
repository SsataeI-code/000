import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getClientCoachId, getThread, markThreadRead } from "@/lib/messages/data";
import { sendClientMessageAction } from "@/lib/messages/actions";
import { ChatThread } from "@/components/messages/ChatThread";

export const dynamic = "force-dynamic";

export default async function ClientMessagesPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const coachId = await getClientCoachId(user.id);

  if (!coachId) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-4xl text-ink">Coach</h1>
        <p className="border border-hairline bg-surface p-5 font-body text-sm text-ink/60">
          Your coach thread will appear here soon.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: coachRow } = await supabase.from("profiles").select("display_name").eq("id", coachId).maybeSingle();
  const coachName = coachRow?.display_name ?? "Your coach";

  const messages = await getThread(coachId, user.id);
  await markThreadRead(coachId, user.id, false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Your coach</p>
          <h1 className="mt-1 text-4xl text-ink">{coachName}</h1>
        </div>
        <Link href="/client" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Done
        </Link>
      </div>

      <ChatThread
        coachId={coachId}
        clientId={user.id}
        viewerId={user.id}
        viewerIsCoach={false}
        coachName={coachName}
        action={sendClientMessageAction}
        initialMessages={messages}
        placeholder={`Message ${coachName}…`}
      />
    </div>
  );
}
