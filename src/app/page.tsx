import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";
import { getSessionUser } from "@/lib/auth/session";
import { homePathForRole } from "@/lib/auth/roles";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getCopyServer, getImageServer } from "@/lib/content/data";
import { SetupNotice } from "@/components/SetupNotice";
import { IconHabits, IconFood, IconBody } from "@/components/icons";

const PILLARS = [
  {
    icon: <IconHabits />,
    title: "Habits that stick",
    body: "Check off what matters each day. Streaks, a heatmap, and gentle nudges keep the chain alive — and forgive you after a miss.",
  },
  {
    icon: <IconFood />,
    title: "Nutrition, simplified",
    body: "Scan a barcode or build a plate. Your calories and macros are set for your goal — count grams or just use your hand.",
  },
  {
    icon: <IconBody />,
    title: "See your progress",
    body: "Weight trends, measurements, and optional private photos. Watch the line move without obsessing over the daily number.",
  },
];

const STEPS = [
  { n: "1", title: "Sign up", body: "Answer a few quick questions — takes a minute." },
  { n: "2", title: "Get your plan", body: "Your daily targets and starter habits are built for you on the spot." },
  { n: "3", title: "Check in daily", body: "A fast, friendly home for the work — with your coach right beside you." },
];

export default async function LandingPage() {
  const configured = hasSupabaseConfig();

  if (configured) {
    const user = await getSessionUser();
    if (user) redirect(homePathForRole(user.role));
  }

  const t = await getCopyServer();
  const image = await getImageServer();
  const coachPhoto = image("coach.photo");

  return (
    <main className="mx-auto flex min-h-dvh max-w-[720px] flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-3">
          <BrandLogo />
          <span className="font-label text-sm uppercase tracking-wide text-ink">{t("brand.name")}</span>
        </span>
        {configured ? (
          <Link
            href="/login"
            className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red"
          >
            {t("auth.login.submit")}
          </Link>
        ) : null}
      </header>

      {/* Hero */}
      <section className="rise py-16 md:py-20">
        <p className="font-label text-xs uppercase tracking-wide text-red">For people who want to see results</p>
        <h1 className="mt-4 text-5xl leading-[0.95] text-ink md:text-6xl">
          Build the habits.
          <br />
          <span className="text-red">The health follows.</span>
        </h1>
        <p className="mt-6 max-w-[46ch] font-body text-lg text-ink/70">
          {t("brand.tagline")} A daily home for your habits, nutrition, and progress — with a coach steering right
          beside you.
        </p>

        {configured ? (
          <div className="mt-10 flex flex-col gap-3 sm:max-w-xs">
            <Link href="/signup">
              <Button>Get started</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost">{t("auth.login.submit")}</Button>
            </Link>
            <p className="font-body text-xs text-ink/40">No app to download — it runs right in your browser.</p>
          </div>
        ) : (
          <div className="mt-10">
            <SetupNotice />
          </div>
        )}
      </section>

      {/* What you get — this is coaching, not a free app */}
      <section className="flex flex-col gap-4 border-t border-hairline pt-12">
        <h2 className="text-3xl text-ink">This is coaching, not just an app</h2>
        <p className="max-w-[48ch] font-body text-ink/70">
          When you join, you&apos;re working with a real coach — the app is where it happens every day.
        </p>
        <ul className="mt-2 flex flex-col divide-y divide-hairline rounded-lg border border-hairline bg-surface">
          {[
            { title: "A plan built for you", body: "Calories, macros, and starter habits set for your goal — and adjusted as you go." },
            { title: "A coach who sees it all", body: "Your logs, streaks, and trends are right in front of them, so they can steer you between check-ins." },
            { title: "Accountability that adapts", body: "A nudge when you slip, wins worth celebrating, and never any shame." },
          ].map((f) => (
            <li key={f.title} className="p-5">
              <p className="font-display text-lg text-ink">{f.title}</p>
              <p className="mt-1 font-body text-sm text-ink/60">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Meet your coach — editable from the CMS (copy + photo) */}
      <section className="flex flex-col gap-4 border-t border-hairline pt-12">
        <h2 className="text-3xl text-ink">{t("landing.coach.heading")}</h2>
        <div className="flex flex-col gap-5 rounded-lg border border-hairline bg-surface p-6 sm:flex-row sm:items-center sm:gap-6">
          {coachPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coachPhoto}
              alt={t("landing.coach.name")}
              className="h-28 w-28 shrink-0 rounded-lg border border-hairline object-cover"
            />
          ) : (
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface-muted font-label text-[10px] uppercase tracking-wide text-ink/40">
              Photo
            </div>
          )}
          <div>
            <p className="font-display text-2xl text-ink">{t("landing.coach.name")}</p>
            <p className="mt-2 max-w-[48ch] font-body text-ink/70">{t("landing.coach.bio")}</p>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="flex flex-col gap-4 border-t border-hairline pt-12">
        <h2 className="text-3xl text-ink">Everything in one place</h2>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="flex flex-col gap-3 rounded-lg border border-hairline bg-surface p-5">
              <span aria-hidden className="block h-7 w-7 text-red">{p.icon}</span>
              <h3 className="font-display text-xl text-ink">{p.title}</h3>
              <p className="font-body text-sm text-ink/60">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="flex flex-col gap-4 border-t border-hairline pt-12">
        <h2 className="text-3xl text-ink">How it works</h2>
        <ol className="mt-2 flex flex-col divide-y divide-hairline rounded-lg border border-hairline bg-surface">
          {STEPS.map((s) => (
            <li key={s.n} className="flex items-start gap-4 p-5">
              <span className="font-display text-3xl leading-none text-red">{s.n}</span>
              <span>
                <span className="block font-display text-lg text-ink">{s.title}</span>
                <span className="block font-body text-sm text-ink/60">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Closing CTA */}
      {configured ? (
        <section className="mt-12 flex flex-col items-start gap-4 rounded-lg border border-red bg-surface p-8">
          <h2 className="text-3xl text-ink">Ready to do the work?</h2>
          <p className="max-w-[42ch] font-body text-ink/70">
            One minute to set up, then it&apos;s small daily habits and real progress. Your coach takes it from there.
          </p>
          <Link href="/signup">
            <Button>Get started</Button>
          </Link>
        </section>
      ) : null}

      <footer className="mt-12 flex items-center justify-between border-t border-hairline pt-6 font-label text-[10px] uppercase tracking-wide text-ink/40">
        <span>{t("brand.name")}</span>
        <span>Built for the work</span>
      </footer>
    </main>
  );
}
