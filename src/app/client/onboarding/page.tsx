import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getClientProfile, getLatestTargets, isOnboarded } from "@/lib/nutrition/data";
import { OnboardingForm } from "@/components/nutrition/OnboardingForm";

export const dynamic = "force-dynamic";

/** First-run intake (§8) → auto-generated targets so day-one logging is real. */
export default async function OnboardingPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [profile, targets] = await Promise.all([
    getClientProfile(user.id),
    getLatestTargets(user.id),
  ]);
  if (isOnboarded(profile, targets)) redirect("/client");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Welcome</p>
        <h1 className="mt-1 text-4xl text-ink">Let&apos;s set your targets</h1>
        <p className="mt-2 font-body text-ink/70">
          A few quick things and we&apos;ll build your daily calories and macros. Your coach can
          fine-tune them anytime.
        </p>
      </div>
      <OnboardingForm />
    </div>
  );
}
