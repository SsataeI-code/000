import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { LoginForm } from "@/components/auth/LoginForm";
import { SetupNotice } from "@/components/SetupNotice";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getCopy } from "@/lib/content/copy";

export default function LoginPage() {
  const configured = hasSupabaseConfig();

  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <BrandMark size={24} />
        <span className="font-label text-xs uppercase tracking-wide text-ink/70">
          {getCopy("brand.name")}
        </span>
      </Link>

      <h1 className="text-4xl text-ink">{getCopy("auth.login.title")}</h1>
      <p className="mt-2 font-body text-ink/70">{getCopy("auth.login.subtitle")}</p>

      <div className="mt-8">{configured ? <LoginForm /> : <SetupNotice />}</div>
    </main>
  );
}
