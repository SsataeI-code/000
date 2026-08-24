import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getContentOverrides } from "@/lib/content/data";
import { getCopy } from "@/lib/content/copy";

export default async function ForgotPasswordPage() {
  const configured = hasSupabaseConfig();
  const overrides = await getContentOverrides();

  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <BrandLogo size={24} />
        <span className="font-label text-xs uppercase tracking-wide text-ink/70">{getCopy("brand.name", overrides)}</span>
      </Link>

      <h1 className="text-4xl text-ink">{getCopy("auth.forgot.title", overrides)}</h1>
      <p className="mt-2 font-body text-ink/70">{getCopy("auth.forgot.subtitle", overrides)}</p>

      <div className="mt-8">{configured ? <ForgotPasswordForm overrides={overrides} /> : <SetupNotice />}</div>
    </main>
  );
}
