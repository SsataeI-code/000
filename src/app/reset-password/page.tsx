import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getContentOverrides } from "@/lib/content/data";
import { getCopy } from "@/lib/content/copy";

// The recovery session is set by /auth/callback; never cache this screen.
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const configured = hasSupabaseConfig();
  const overrides = await getContentOverrides();

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-6 flex items-center justify-center gap-2.5">
        <BrandLogo size={30} />
        <span className="font-label text-sm uppercase tracking-wide text-ink">{getCopy("brand.name", overrides)}</span>
      </Link>

      <div className="rise rounded-xl border border-hairline bg-surface p-6 sm:p-8">
        <h1 className="text-3xl text-ink">{getCopy("auth.reset.title", overrides)}</h1>
        <p className="mt-2 font-body text-ink/60">{getCopy("auth.reset.subtitle", overrides)}</p>

        <div className="mt-7">{configured ? <ResetPasswordForm overrides={overrides} /> : <SetupNotice />}</div>
      </div>
    </main>
  );
}
