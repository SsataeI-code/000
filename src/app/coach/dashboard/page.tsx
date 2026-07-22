import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getDashboardLayout } from "@/lib/coach/data";
import { DashboardEditor } from "@/components/coach/DashboardEditor";

export const dynamic = "force-dynamic";

/** Customize which dashboard tiles show and in what order (§9). */
export default async function DashboardSettingsPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "coach" && user.role !== "owner") redirect("/coach");

  const layout = await getDashboardLayout(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Dashboard</p>
          <h1 className="mt-1 text-4xl text-ink">Customize</h1>
        </div>
        <Link href="/coach" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Done
        </Link>
      </div>

      <p className="font-body text-sm text-ink/60">
        Arrange your dashboard. Drag order with the arrows, and switch tiles on or off. It&apos;s your command center — make it yours.
      </p>

      <DashboardEditor initial={layout} />
    </div>
  );
}
