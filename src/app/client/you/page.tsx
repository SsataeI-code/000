import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getNotifications } from "@/lib/notifications/data";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { PushToggle } from "@/components/push/PushToggle";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function ClientYouPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const notifications = await getNotifications(user.id);
  const name = user.profile?.display_name;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">You</p>
        <h1 className="mt-1 text-4xl text-ink">{name ?? "Your account"}</h1>
      </div>

      <NotificationsList notifications={notifications} />

      <PushToggle />

      <section className="border border-hairline bg-surface p-5">
        <p className="font-body text-sm text-ink/70">{user.email}</p>
        <div className="mt-3">
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
