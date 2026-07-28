import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getCoachReferrals } from "@/lib/referrals/data";
import { ReferralRow } from "@/components/referrals/ReferralRow";
import { getCopyServer } from "@/lib/content/data";

export const dynamic = "force-dynamic";

/** Coach's referral queue (§8): reward or waive; the coach controls every discount. */
export default async function CoachReferralsPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "client") redirect("/client");

  const owner = { owner: user.role === "owner" };
  const t = await getCopyServer();
  const referrals = await getCoachReferrals(user.id, owner);
  const pending = referrals.filter((r) => r.status === "joined");
  const decided = referrals.filter((r) => r.status !== "joined");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Growth</p>
          <h1 className="mt-1 text-4xl text-ink">{t("coach.referrals.title")}</h1>
        </div>
        <Link
          href="/coach"
          className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red"
        >
          Dashboard
        </Link>
      </div>
      <p className="font-body text-sm text-ink/60">{t("coach.referrals.subtitle")}</p>

      {referrals.length === 0 ? (
        <p className="border border-hairline bg-surface p-5 font-body text-sm text-ink/60">
          {t("coach.referrals.empty")}
        </p>
      ) : (
        <>
          {pending.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-2xl text-ink">To reward ({pending.length})</h2>
              <ul className="flex flex-col gap-3">
                {pending.map((r) => (
                  <ReferralRow key={r.id} referral={r} />
                ))}
              </ul>
            </section>
          ) : null}

          {decided.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-2xl text-ink">Handled</h2>
              <ul className="flex flex-col gap-3">
                {decided.map((r) => (
                  <ReferralRow key={r.id} referral={r} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
