import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getNotifications } from "@/lib/notifications/data";
import { getContentOverrides } from "@/lib/content/data";
import { getMyReferralCode, getMyReferralStats } from "@/lib/referrals/data";
import { getClientProfile } from "@/lib/nutrition/data";
import { GoalPicker } from "@/components/nutrition/GoalPicker";
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

      <GoalPicker goal={profile?.goal ?? "maintain"} />

      <InvitePanel code={referralCode} origin={origin} stats={referralStats} overrides={overrides} />

      <PushToggle />

      <QuietHours
        initialStart={profile?.quiet_start ?? null}
        initialEnd={profile?.quiet_end ?? null}
        initialTimezone={profile?.timezone ?? null}
      />

      <Link
        href="/client/journal"
        className="flex items-center justify-between rounded-lg border border-hairline bg-surface p-5 hover:border-red"
      >
        <span className="min-w-0">
          <span className="block text-2xl text-ink">Journal</span>
          <span className="block font-body text-sm text-ink/60">Snap your food or jot how the day went — your coach sees it</span>
        </span>
        <span aria-hidden className="shrink-0 font-label text-xs uppercase tracking-wide text-red">Open →</span>
      </Link>

      <Link
        href="/client/report"
        className="flex items-center justify-between rounded-lg border border-hairline bg-surface p-5 hover:border-red"
      >
        <span className="min-w-0">
          <span className="block text-2xl text-ink">Weekly recap</span>
          <span className="block font-body text-sm text-ink/60">Your wins this week + a couple things to work on</span>
        </span>
        <span aria-hidden className="shrink-0 font-label text-xs uppercase tracking-wide text-red">View →</span>
      </Link>

      <Link
        href="/client/connect"
        className="flex items-center justify-between rounded-lg border border-hairline bg-surface p-5 hover:border-red"
      >
        <span className="min-w-0">
          <span className="block text-2xl text-ink">Connect a tracker</span>
          <span className="block font-body text-sm text-ink/60">Auto-sync steps &amp; sleep from Oura, Fitbit, Whoop</span>
        </span>
        <span aria-hidden className="shrink-0 font-label text-xs uppercase tracking-wide text-red">Connect →</span>
      </Link>

      <section className="rounded-lg border border-hairline bg-surface p-5">
        <h2 className="text-2xl text-ink">Your data</h2>
        <p className="mt-1 font-body text-sm text-ink/60">
          Download everything you&apos;ve logged — habits, food, water, weight, and your targets — as a file you keep.
        </p>
        <a
          href={`/api/export/${user.id}`}
          className="mt-3 inline-flex min-h-tap items-center rounded-lg border border-hairline bg-surface px-4 py-2 font-label text-xs uppercase tracking-wide text-ink hover:border-red hover:text-red"
        >
          Export my data (JSON)
        </a>
      </section>

      <section className="rounded-lg border border-hairline bg-surface p-5">
        <p className="font-body text-sm text-ink/70">{user.email}</p>
        <div className="mt-3">
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
