import Link from "next/link";
import type { Notification } from "@/lib/types/db";
import { markAllNotificationsReadAction } from "@/lib/notifications/actions";

function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/** In-app notification inbox (§10). Server-rendered; "Mark all read" is a form action. */
export function NotificationsList({ notifications }: { notifications: Notification[] }) {
  const unread = notifications.filter((n) => n.read_at == null).length;

  return (
    <section aria-label="Notifications" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl text-ink">
          Notifications{unread > 0 ? <span className="ml-2 align-middle text-base text-red">{unread} new</span> : null}
        </h2>
        {unread > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
              Mark all read
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <p className="border border-hairline bg-surface p-5 font-body text-sm text-ink/60">
          You&apos;re all caught up. Nudges, messages, and weekly recaps will show up here.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline border border-hairline bg-surface">
          {notifications.map((n) => {
            const unreadRow = n.read_at == null;
            const inner = (
              <span className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${unreadRow ? "bg-red" : "bg-transparent"}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate font-body text-sm ${unreadRow ? "text-ink" : "text-ink/70"}`}>{n.title}</span>
                    <span className="shrink-0 font-body text-[10px] text-ink/40">{ago(n.created_at)}</span>
                  </span>
                  {n.body ? <span className="mt-0.5 block font-body text-xs text-ink/55 line-clamp-2">{n.body}</span> : null}
                </span>
              </span>
            );
            return (
              <li key={n.id} className="px-4 py-3">
                {n.link ? (
                  <Link href={n.link} className="block min-h-tap hover:opacity-80">{inner}</Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
