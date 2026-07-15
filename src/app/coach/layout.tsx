import { redirect } from "next/navigation";
import Link from "next/link";
import { BottomTabBar, type TabItem } from "@/components/BottomTabBar";
import { BrandMark } from "@/components/BrandMark";
import { SignOutButton } from "@/components/SignOutButton";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessArea } from "@/lib/auth/roles";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getCopy } from "@/lib/content/copy";
import { IconAttention, IconMessages, IconRoster, IconYou } from "@/components/icons";

// Per-user, auth-gated surface — never statically cached (§2 reliability).
export const dynamic = "force-dynamic";

const tabs: TabItem[] = [
  { href: "/coach", label: getCopy("coach.nav.attention"), icon: <IconAttention /> },
  { href: "/coach/roster", label: getCopy("coach.nav.roster"), icon: <IconRoster /> },
  { href: "/coach/messages", label: getCopy("coach.nav.messages"), icon: <IconMessages /> },
  { href: "/coach/you", label: getCopy("coach.nav.you"), icon: <IconYou /> },
];

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseConfig()) redirect("/");

  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAccessArea(user.role, "coach")) redirect("/client");

  return (
    <div className="mx-auto min-h-dvh max-w-[960px] pb-24 md:pb-0">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-hairline bg-surface/95 px-5 py-3 backdrop-blur">
        <span className="flex items-center gap-2">
          <BrandMark size={22} />
          <span className="font-label text-xs uppercase tracking-wide text-ink/70">
            {getCopy("coach.dashboard.title")}
          </span>
        </span>
        <div className="flex items-center gap-4">
          {user.role === "owner" ? (
            <span className="font-label text-[10px] uppercase tracking-wide text-red">
              Owner
            </span>
          ) : null}
          <SignOutButton />
        </div>
      </header>

      {/* Desktop rail (≥780px). Bottom tabs take over below that. */}
      <div className="md:flex md:gap-6 md:px-5 md:py-6">
        <nav
          aria-label="Sections"
          className="hidden md:block md:w-44 md:shrink-0"
        >
          <ul className="flex flex-col gap-1">
            {tabs.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className="flex min-h-tap items-center gap-2 px-2 font-label text-sm uppercase tracking-wide text-ink/70 hover:text-red"
                >
                  <span aria-hidden className="h-5 w-5">
                    {t.icon}
                  </span>
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 px-5 py-6 md:px-0 md:py-0">{children}</div>
      </div>

      <BottomTabBar items={tabs} />
    </div>
  );
}
