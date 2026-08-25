import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getRoster } from "@/lib/coach/data";
import { getThreads } from "@/lib/messages/data";

export const dynamic = "force-dynamic";

function ago(iso: string | null): string {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default async function CoachMessagesPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const roster = await getRoster(user.id, { owner: user.role === "owner" });
  const threads = await getThreads(user.id, roster.map((c) => ({ id: c.id, name: c.name })));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-4xl text-ink">Messages</h1>

      {roster.length === 0 ? (
        <p className="rounded-lg border border-hairline bg-surface p-5 font-body text-sm text-ink/60">
          No clients yet. Once someone joins, your private thread with them lives here.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline bg-surface">
          {threads.map((t) => (
            <li key={t.clientId}>
              <Link href={`/coach/messages/${t.clientId}`} className="flex min-h-tap items-center justify-between gap-3 px-4 py-3 hover:bg-surface-muted">
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-body text-base text-ink">{t.clientName}</span>
                    {t.unread > 0 ? (
                      <span className="shrink-0 rounded-full bg-red px-1.5 font-label text-[10px] font-600 text-white">{t.unread}</span>
                    ) : null}
                  </span>
                  <span className="block truncate font-body text-xs text-ink/50">
                    {t.lastBody ? `${t.lastKind === "client" ? "" : "You: "}${t.lastBody}` : "No messages yet"}
                  </span>
                </span>
                <span className="shrink-0 font-body text-[10px] text-ink/40">{ago(t.lastAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
