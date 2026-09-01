import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getSetupHealth, type Check } from "@/lib/setup/health";

export const dynamic = "force-dynamic";

/** Owner-only setup health — what's set up in Supabase/Vercel, at a glance. */
export default async function SetupHealthPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "owner") redirect("/coach");

  const report = await getSetupHealth();
  const allGood = report.okCount === report.total;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Owner</p>
          <h1 className="mt-1 text-4xl text-ink">Setup health</h1>
        </div>
        <Link href="/coach" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Dashboard
        </Link>
      </div>

      {/* Score banner */}
      <section className={`rounded-2xl border p-5 shadow-card ${allGood ? "border-success/40 bg-success/10" : "border-hairline bg-grad-elevated text-white"}`}>
        <p className="font-display text-3xl uppercase toon-shadow">
          {report.okCount}/{report.total} checks passing
        </p>
        <p className={`mt-1 font-body text-sm ${allGood ? "text-success" : "text-white/80"}`}>
          {allGood
            ? "Everything the app needs is set up. Nice."
            : "Some pieces aren't set up yet — the features below will stay quiet until you fix them."}
        </p>
        {!allGood ? (
          <p className="mt-2 font-body text-sm text-white/70">
            Missing tables? Paste <code className="rounded bg-black/40 px-1.5 py-0.5 text-white">supabase/run-everything.sql</code> into Supabase → SQL Editor → Run. It&apos;s safe to re-run.
          </p>
        ) : null}
      </section>

      <CheckGroup title="Database tables" checks={report.tables} />
      <CheckGroup title="Feature columns" checks={report.columns} />
      <CheckGroup title="Environment variables" checks={report.env} />
    </div>
  );
}

function CheckGroup({ title, checks }: { title: string; checks: Check[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-5 shadow-card">
      <h2 className="text-2xl text-ink">{title}</h2>
      <ul className="flex flex-col divide-y divide-hairline">
        {checks.map((c) => (
          <li key={c.name} className="flex items-start gap-3 py-3">
            <span
              aria-hidden
              className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full font-label text-xs font-600 ${
                c.ok ? "bg-success/20 text-success" : "bg-red/20 text-red-ink"
              }`}
            >
              {c.ok ? "✓" : "!"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-body text-sm text-ink">{c.name}</p>
              <p className="font-body text-xs text-ink/50">{c.detail}</p>
              {!c.ok && c.fix ? <p className="mt-0.5 font-label text-[11px] uppercase tracking-wide text-red-ink">{c.fix}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
