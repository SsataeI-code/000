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

const MENU: { group: string; items: { href: string; title: string; desc: string }[] }[] = [
  {
    group: "Progress",
    items: [
      { href: "/client/checkin", title: "Weekly check-in", desc: "Your weekly pulse for your coach" },
      { href: "/client/journal", title: "Journal", desc: "Snap your food or jot how the day went" },
      { href: "/client/lifts", title: "Lift tracker", desc: "Log lifts, see PRs & estimated 1RM" },
      { href: "/client/achievements", title: "Badges & levels", desc: "Your XP, level, streaks and badges" },
      { href: "/client/report", title: "Weekly recap", desc: "Your wins + a couple things to work on" },
    ],
  },
  {
    group: "Nutrition",
    items: [
      { href: "/client/meals", title: "Saved meals", desc: "Build and reuse your go-to meals" },
      { href: "/client/plate", title: "Plate builder", desc: "Learn balance and log a plate fast" },
      { href: "/client/assistant", title: "Ask", desc: "Meal ideas & answers on your day" },
    ],
  },
];

function MenuRow({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="flex min-h-tap items-center justify-between gap-3 px-4 py-3.5 hover:bg-surface-muted">
      <span className="min-w-0">
        <span className="block font-body text-base text-ink">{title}</span>
        <span className="block truncate font-body text-xs text-ink/55">{desc}</span>
      </span>
      <span aria-hidden className="shrink-0 font-label text-lg text-ink/40">→</span>
    </Link>
  );
}

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

      {/* Everything, grouped and findable */}
      {MENU.map((g) => (
        <section key={g.group} className="flex flex-col gap-2">
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">{g.group}</p>
          <div className="flex flex-col divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card">
            {g.items.map((it) => (
              <MenuRow key={it.href} {...it} />
            ))}
          </div>
        </section>
      ))}

      {/* Devices */}
      <section className="flex flex-col gap-2">
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Devices & friends</p>
        <div className="flex flex-col divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card">
          <MenuRow href="/client/connect" title="Connect a tracker" desc="Auto-sync steps & sleep from Oura, Fitbit, Whoop" />
        </div>
      </section>

      {/* Settings */}
      <details className="group rounded-2xl border border-hairline bg-surface shadow-card">
        <summary className="flex min-h-tap cursor-pointer list-none items-center justify-between px-5 py-4">
          <span className="text-2xl text-ink">Settings</span>
          <span aria-hidden className="font-label text-xs uppercase tracking-wide text-ink/40 group-open:hidden">Open</span>
          <span aria-hidden className="hidden font-label text-xs uppercase tracking-wide text-ink/40 group-open:inline">Close</span>
        </summary>
        <div className="flex flex-col gap-6 border-t border-hairline p-5">
          <GoalPicker goal={profile?.goal ?? "maintain"} />
          <PushToggle />
          <QuietHours
            initialStart={profile?.quiet_start ?? null}
            initialEnd={profile?.quiet_end ?? null}
            initialTimezone={profile?.timezone ?? null}
          />
          <InvitePanel code={referralCode} origin={origin} stats={referralStats} overrides={overrides} />
        </div>
      </details>

      {/* Your data */}
      <section className="rounded-2xl border border-hairline bg-surface shadow-card p-5">
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

      <section className="rounded-2xl border border-hairline bg-surface shadow-card p-5">
        <p className="font-body text-sm text-ink/70">{user.email}</p>
        <div className="mt-3">
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
