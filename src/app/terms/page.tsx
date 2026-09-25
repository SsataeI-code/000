import Link from "next/link";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata: Metadata = {
  title: "Terms of Service — Total Form Fitness",
  description: "The terms for using Total Form Fitness.",
};

const UPDATED = "September 2026";

/**
 * Public terms of service. Plain-language defaults; the coach should have counsel
 * review before relying on it. Reachable signed-out (needed for the App Store).
 */
export default function TermsPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-[720px] px-5 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo size={22} />
          <span className="font-label text-sm uppercase tracking-wide text-ink/70">Total Form Fitness</span>
        </Link>
        <Link href="/" className="min-h-tap font-label text-sm uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">Home</Link>
      </header>

      <h1 className="text-4xl text-ink">Terms of Service</h1>
      <p className="mt-2 font-body text-sm text-ink/50">Last updated: {UPDATED}</p>

      <div className="mt-8 flex flex-col gap-6 font-body text-[15px] leading-relaxed text-ink/80">
        <section className="flex flex-col gap-2">
          <h2 className="font-label text-sm uppercase tracking-wide text-ink">Using the app</h2>
          <p>Total Form Fitness gives you tools to track habits, nutrition, and body progress and to work with your coach. Use it for your own health and keep your login secure. You must be able to form a binding agreement to use it.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-label text-sm uppercase tracking-wide text-ink">Coaching &amp; payments</h2>
          <p>Coaching is arranged directly between you and your coach. Any fees are handled outside the app — the app itself has no paywalls or purchases.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-label text-sm uppercase tracking-wide text-ink">Not medical advice</h2>
          <p>The app supports healthy habits and nutrition awareness. It does not diagnose, treat, or provide medical advice, and it is not a substitute for a qualified professional. Consult one for medical concerns, including before major diet or exercise changes.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-label text-sm uppercase tracking-wide text-ink">Your content</h2>
          <p>The data and photos you log are yours. You grant us the permission needed to store and display them to run the service (including sharing your health data with your coach, which you consent to at sign-up). You can export your data anytime.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-label text-sm uppercase tracking-wide text-ink">Acceptable use</h2>
          <p>Don&apos;t misuse the service — no attempts to break security, access other people&apos;s data, or disrupt the app. We may suspend accounts that do.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-label text-sm uppercase tracking-wide text-ink">Changes &amp; contact</h2>
          <p>We may update these terms as the app evolves; material changes will be noted in-app. Questions? Email <a className="text-red underline underline-offset-4" href="mailto:adam@totalformfitness.com">adam@totalformfitness.com</a>.</p>
        </section>

        <p className="mt-4 font-body text-sm text-ink/45">
          See also our <Link href="/privacy" className="text-red underline underline-offset-4">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
