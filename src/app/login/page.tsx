import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginForm } from "@/components/auth/LoginForm";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getContentOverrides } from "@/lib/content/data";
import { getCopy } from "@/lib/content/copy";

export default async function LoginPage() {
  const configured = hasSupabaseConfig();
  const overrides = await getContentOverrides();

  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <BrandLogo size={24} />
        <span className="font-label text-xs uppercase tracking-wide text-ink/70">
          {getCopy("brand.name", overrides)}
        </span>
      </Link>

      <h1 className="text-4xl text-ink">{getCopy("auth.login.title", overrides)}</h1>
      <p className="mt-2 font-body text-ink/70">{getCopy("auth.login.subtitle", overrides)}</p>

      <div className="mt-8">{configured ? <LoginForm overrides={overrides} /> : <SetupNotice />}</div>
    </main>
  );
}
