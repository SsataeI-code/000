import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getNotifications } from "@/lib/notifications/data";
import { getContentOverrides } from "@/lib/content/data";
import { getMyReferralCode, getMyReferralStats } from "@/lib/referrals/data";
import { getClientProfile } from "@/lib/nutrition/data";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { InvitePanel } from "@/components/referrals/InvitePanel";
import { QuietHours } from "@/components/notifications/QuietHours";
import { PushToggle } from "@/components/push/PushToggle";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function ClientYouPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [notifications, referralCode, referralStats, overrides, profile] = await Promise.all([
    getNotifications(user.id),
    getMyReferralCode(),
    getMyReferralStats(user.id),
    getContentOverrides(),
    getClientProfile(user.id),
  ]);
  const name = user.profile?.display_name;
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">You</p>
        <h1 className="mt-1 text-4xl text-ink">{name ?? "Your account"}</h1>
      </div>

      <NotificationsList notifications={notifications} />

      <InvitePanel code={referralCode} origin={origin} stats={referralStats} overrides={overrides} />

      <PushToggle />

      <QuietHours
        initialStart={profile?.quiet_start ?? null}
        initialEnd={profile?.quiet_end ?? null}
        initialTimezone={profile?.timezone ?? null}
      />

      <section className="border border-hairline bg-surface p-5">
        <p className="font-body text-sm text-ink/70">{user.email}</p>
        <div className="mt-3">
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
