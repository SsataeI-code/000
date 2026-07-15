import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { getSessionUser } from "@/lib/auth/session";
import { homePathForRole } from "@/lib/auth/roles";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getCopy } from "@/lib/content/copy";
import { SetupNotice } from "@/components/SetupNotice";

export default async function LandingPage() {
  const configured = hasSupabaseConfig();

  if (configured) {
    const user = await getSessionUser();
    if (user) redirect(homePathForRole(user.role));
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-between px-6 py-12">
      <header className="flex items-center gap-3">
        <BrandMark />
        <span className="font-label text-sm uppercase tracking-wide text-ink">
          {getCopy("brand.name")}
        </span>
      </header>

      <section className="py-16">
        <h1 className="text-5xl leading-[0.95] text-ink md:text-6xl">
          Build the habits.
          <br />
          <span className="text-red">The health follows.</span>
        </h1>
        <p className="mt-6 max-w-[42ch] font-body text-lg text-ink/70">
          {getCopy("brand.tagline")} A daily home for your habits, nutrition, and
          progress — with your coach right beside you.
        </p>

        {configured ? (
          <div className="mt-10 flex flex-col gap-3">
            <Link href="/signup">
              <Button>{getCopy("auth.signup.submit")}</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost">{getCopy("auth.login.submit")}</Button>
            </Link>
          </div>
        ) : (
          <SetupNotice />
        )}
      </section>

      <footer className="font-label text-xs uppercase tracking-wide text-ink/40">
        Phase 0 · Foundation
      </footer>
    </main>
  );
}
