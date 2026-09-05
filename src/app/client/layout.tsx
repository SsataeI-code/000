import { redirect } from "next/navigation";
import { BottomTabBar, type TabItem } from "@/components/BottomTabBar";
import { BrandLogo } from "@/components/BrandLogo";
import { HelpLauncher } from "@/components/help/HelpLauncher";
import { TimezoneSync } from "@/components/client/TimezoneSync";
import { SignOutButton } from "@/components/SignOutButton";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessArea, hasCoachPowers } from "@/lib/auth/roles";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getCopyServer } from "@/lib/content/data";
import { getViewerGame } from "@/lib/habits/state";
import { LevelBar } from "@/components/habits/LevelBar";
import { MilestoneCelebration } from "@/components/habits/MilestoneCelebration";
import { IconBody, IconFood, IconHabits, IconMessages, IconToday, IconYou } from "@/components/icons";

// Per-user, auth-gated surface — never statically cached (§2 reliability).
export const dynamic = "force-dynamic";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseConfig()) redirect("/");

  // Defense in depth — middleware gates too, but never trust a single guard.
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAccessArea(user.role, "client")) redirect("/coach");

  const t = await getCopyServer();
  const game = await getViewerGame(user.id);
  const tabs: TabItem[] = [
    { href: "/client", label: t("client.nav.today"), icon: <IconToday /> },
    { href: "/client/habits", label: t("client.nav.habits"), icon: <IconHabits /> },
    { href: "/client/food", label: t("client.nav.food"), icon: <IconFood /> },
    { href: "/client/body", label: t("client.nav.body"), icon: <IconBody /> },
    { href: "/client/messages", label: t("client.nav.coach"), icon: <IconMessages /> },
    { href: "/client/you", label: t("client.nav.you"), icon: <IconYou /> },
  ];

  return (
    <div className="mx-auto min-h-dvh max-w-[560px] pb-24">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-hairline bg-surface/95 px-5 py-3 backdrop-blur">
        <span className="flex items-center gap-2">
          <BrandLogo size={22} />
          <span className="font-label text-xs uppercase tracking-wide text-ink/70">
            {t("brand.name")}
          </span>
        </span>
        <span className="flex items-center gap-4">
          {hasCoachPowers(user.role) ? (
            <Link
              href="/coach"
              className="min-h-tap font-label text-[10px] uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red"
            >
              Coach view
            </Link>
          ) : null}
          <SignOutButton />
        </span>
      </header>

      {/* Persistent level bar — progress always in view (game HUD). */}
      {game ? (
        <div className="sticky top-[49px] z-20 border-b border-hairline bg-surface-muted/80 px-5 py-2 backdrop-blur">
          <LevelBar game={game} />
        </div>
      ) : null}

      {/* Celebrate a new level or badge the moment it's unlocked (on-brand, no confetti). */}
      {game ? (
        <MilestoneCelebration
          level={game.state.level}
          levelName={game.state.levelName}
          achievements={game.state.achievements}
        />
      ) : null}

      <div className="rise px-5 py-6">{children}</div>

      {/* Report the browser timezone so daily stats reset at the client's midnight. */}
      <TimezoneSync />

      {/* Instant answer helper, reachable from every client screen. */}
      <HelpLauncher />

      <BottomTabBar items={tabs} />
    </div>
  );
}
