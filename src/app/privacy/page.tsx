import Link from "next/link";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata: Metadata = {
  title: "Privacy Policy — Total Form Fitness",
  description: "How Total Form Fitness collects, uses, and protects your data.",
};

const UPDATED = "September 2026";

/**
 * Public privacy policy (§13). Required for the App Store and for any app with
 * account creation. Plain-language defaults aligned with the brief; the coach
 * should have counsel review before relying on it. Reachable signed-out.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-[720px] px-5 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo size={22} />
          <span className="font-label text-sm uppercase tracking-wide text-ink/70">Total Form Fitness</span>
        </Link>
        <Link href="/" className="min-h-tap font-label text-sm uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">Home</Link>
      </header>

      <h1 className="text-4xl text-ink">Privacy Policy</h1>
      <p className="mt-2 font-body text-sm text-ink/50">Last updated: {UPDATED}</p>

      <div className="mt-8 flex flex-col gap-6 font-body text-[15px] leading-relaxed text-ink/80">
        <section className="flex flex-col gap-2">
          <h2 className="font-label text-sm uppercase tracking-wide text-ink">Who we are</h2>
          <p>Total Form Fitness is a habits-first health-coaching app operated by Total Form Fitness (White Plains, NY). This policy explains what we collect, why, and the control you have over your data.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-label text-sm uppercase tracking-wide text-ink">What we collect</h2>
          <p>Account details you provide (name, email). Health and activity data you choose to log — habits, food and nutrition, body weight and optional measurements, optional progress photos, hydration, and any connected wearable metrics (steps, sleep, heart rate). Basic technical data needed to run the service.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-label text-sm uppercase tracking-wide text-ink">How we use it</h2>
          <p>To provide the app: show your progress, calculate targets, send reminders and notifications you enable, and let your coach see and guide your progress. We do not sell your personal data, and we do not use it for third-party advertising.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-label text-sm uppercase tracking-wide text-ink">Who can see your data</h2>
          <p>Your coach can see the health data you log — this is the point of coaching, and you consent to it at sign-up. Other clients never see your data. Progress photos are private and stored with restricted access; only you and your coach can view them.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-label text-sm uppercase tracking-wide text-ink">Storage &amp; processing</h2>
          <p>Data is stored with our infrastructure providers (Supabase for the database, authentication, and file storage; Vercel for hosting). Notifications may be delivered via web push and, for re-engagement, email. If AI features are enabled, prompts grounded in your data may be processed by our AI provider to generate suggestions; this is optional and never used to make medical decisions.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-label text-sm uppercase tracking-wide text-ink">Your rights &amp; retention</h2>
          <p>You can export your full history at any time from the app. If you leave, your data stays available for one year and can be exported during that window, then it is archived. To request deletion, contact your coach or us at the address below.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-label text-sm uppercase tracking-wide text-ink">Health disclaimer</h2>
          <p>Total Form Fitness supports healthy habits and nutrition awareness. It is not a medical device and does not provide medical advice. Talk to a qualified professional for medical concerns.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-label text-sm uppercase tracking-wide text-ink">Contact</h2>
          <p>Questions about your privacy? Email <a className="text-red underline underline-offset-4" href="mailto:adam@totalformfitness.com">adam@totalformfitness.com</a>.</p>
        </section>

        <p className="mt-4 font-body text-sm text-ink/45">
          See also our <Link href="/terms" className="text-red underline underline-offset-4">Terms of Service</Link>.
        </p>
      </div>
    </main>
  );
}
