import { redirect } from "next/navigation";
import { BottomTabBar, type TabItem } from "@/components/BottomTabBar";
import { BrandMark } from "@/components/BrandMark";
import { SignOutButton } from "@/components/SignOutButton";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessArea } from "@/lib/auth/roles";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getCopy } from "@/lib/content/copy";
import { IconBody, IconFood, IconHabits, IconToday, IconYou } from "@/components/icons";

// Per-user, auth-gated surface — never statically cached (§2 reliability).
export const dynamic = "force-dynamic";

const tabs: TabItem[] = [
  { href: "/client", label: getCopy("client.nav.today"), icon: <IconToday /> },
  { href: "/client/habits", label: getCopy("client.nav.habits"), icon: <IconHabits /> },
  { href: "/client/food", label: getCopy("client.nav.food"), icon: <IconFood /> },
  { href: "/client/body", label: getCopy("client.nav.body"), icon: <IconBody /> },
  { href: "/client/you", label: getCopy("client.nav.you"), icon: <IconYou /> },
];

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseConfig()) redirect("/");

  // Defense in depth — middleware gates too, but never trust a single guard.
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAccessArea(user.role, "client")) redirect("/coach");

  return (
    <div className="mx-auto min-h-dvh max-w-[560px] pb-24">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-hairline bg-surface/95 px-5 py-3 backdrop-blur">
        <span className="flex items-center gap-2">
          <BrandMark size={22} />
          <span className="font-label text-xs uppercase tracking-wide text-ink/70">
            {getCopy("brand.name")}
          </span>
        </span>
        <SignOutButton />
      </header>

      <div className="px-5 py-6">{children}</div>

      <BottomTabBar items={tabs} />
    </div>
  );
}
