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
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-6 flex items-center justify-center gap-2.5">
        <BrandLogo size={30} />
        <span className="font-label text-sm uppercase tracking-wide text-ink">
          {getCopy("brand.name", overrides)}
        </span>
      </Link>

      <div className="rise rounded-xl border border-hairline bg-surface p-6 sm:p-8">
        <h1 className="text-3xl text-ink">{getCopy("auth.login.title", overrides)}</h1>
        <p className="mt-2 font-body text-ink/60">{getCopy("auth.login.subtitle", overrides)}</p>

        <div className="mt-7">{configured ? <LoginForm overrides={overrides} /> : <SetupNotice />}</div>
      </div>
    </main>
  );
}
