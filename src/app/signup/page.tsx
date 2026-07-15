import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { SignupForm } from "@/components/auth/SignupForm";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { coachCodeFromParams } from "@/lib/auth/coach-code";
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

  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <BrandMark size={24} />
        <span className="font-label text-xs uppercase tracking-wide text-ink/70">
          {getCopy("brand.name")}
        </span>
      </Link>

      <h1 className="text-4xl text-ink">{getCopy("auth.signup.title")}</h1>
      <p className="mt-2 font-body text-ink/70">{getCopy("auth.signup.subtitle")}</p>

      <div className="mt-8">
        {configured ? <SignupForm coachCode={coachCode} /> : <SetupNotice />}
      </div>
    </main>
  );
}
