import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { coachHasClient } from "@/lib/coach/data";
import { getThread, markThreadRead } from "@/lib/messages/data";
import { sendCoachMessageAction } from "@/lib/messages/actions";
import { hasAiConfig } from "@/lib/ai/client";
import { ChatThread } from "@/components/messages/ChatThread";

export const dynamic = "force-dynamic";

export default async function CoachThreadPage({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  if (user.role !== "owner" && !(await coachHasClient(user.id, id))) notFound();

  const supabase = await createClient();
  const { data: nameRow } = await supabase.from("profiles").select("display_name").eq("id", id).maybeSingle();
  const clientName = nameRow?.display_name ?? "Client";

  const messages = await getThread(user.id, id);
  await markThreadRead(user.id, id, true);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Message</p>
          <h1 className="mt-1 text-4xl text-ink">{clientName}</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/coach/clients/${id}`} className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
            Profile
          </Link>
          <Link href="/coach/messages" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
            All
          </Link>
        </div>
      </div>

      <ChatThread
        coachId={user.id}
        clientId={id}
        viewerId={user.id}
        viewerIsCoach
        coachName="You"
        action={sendCoachMessageAction.bind(null, id)}
        initialMessages={messages}
        placeholder={`Message ${clientName}…`}
        canDraft
        aiEnabled={hasAiConfig()}
      />
    </div>
  );
}
