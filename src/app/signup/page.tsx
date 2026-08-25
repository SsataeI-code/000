import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { SignupForm } from "@/components/auth/SignupForm";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { coachCodeFromParams } from "@/lib/auth/coach-code";
import { referralCodeFromParams } from "@/lib/referrals/code";
import { getContentOverrides } from "@/lib/content/data";
import { getCopy } from "@/lib/content/copy";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const configured = hasSupabaseConfig();

  // Coach-code deep link: /signup?coach=ABC123 prefills the code (§8).
  const params = await searchParams;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") usp.set(k, v);
  }
  const coachCode = coachCodeFromParams(usp) ?? undefined;
  const referralCode = referralCodeFromParams(usp) ?? undefined;
  const overrides = await getContentOverrides();

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-6 flex items-center justify-center gap-2.5">
        <BrandLogo size={30} />
        <span className="font-label text-sm uppercase tracking-wide text-ink">
          {getCopy("brand.name", overrides)}
        </span>
      </Link>

      <div className="rise rounded-xl border border-hairline bg-surface p-6 sm:p-8">
        <h1 className="text-3xl text-ink">{getCopy("auth.signup.title", overrides)}</h1>
        <p className="mt-2 font-body text-ink/60">{getCopy("auth.signup.subtitle", overrides)}</p>
        <p className="mt-3 font-label text-[11px] uppercase tracking-wide text-red/80">
          {getCopy("auth.signup.reassure", overrides)}
        </p>

        {referralCode ? (
          <p className="mt-4 rounded-lg border border-hairline bg-elevated px-4 py-3 font-body text-sm text-white">
            {getCopy("auth.signup.invited", overrides)}
          </p>
        ) : null}

        <div className="mt-7">
          {configured ? <SignupForm coachCode={coachCode} referralCode={referralCode} overrides={overrides} /> : <SetupNotice />}
        </div>
      </div>
    </main>
  );
}
