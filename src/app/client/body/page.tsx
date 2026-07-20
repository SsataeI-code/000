import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getBodyMeasurements } from "@/lib/body/data";
import { weightTrend, trendChangeKg, kgToLb } from "@/lib/body/trend";
import { BodyLogForm } from "@/components/body/BodyLogForm";

export const dynamic = "force-dynamic";

export default async function BodyPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const measurements = await getBodyMeasurements(user.id);
  const trend = weightTrend(measurements);
  const latest = trend[trend.length - 1];
  const change = trendChangeKg(trend);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl text-ink">Body</h1>
        <Link href="/client" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Done
        </Link>
      </div>

      {latest ? (
        <section className="border border-hairline bg-surface p-5">
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Weight (trend)</p>
          <p className="mt-1 font-display text-4xl text-ink">{kgToLb(latest.avgKg)} lb</p>
          {trend.length > 1 ? (
            <p className="mt-1 font-body text-sm text-ink/60">
              {change === 0 ? "Holding steady" : `${change < 0 ? "↓" : "↑"} ${Math.abs(kgToLb(Math.abs(change)))} lb since you started tracking`}
            </p>
          ) : null}
          <Sparkline trend={trend} />
        </section>
      ) : (
        <p className="border border-hairline bg-surface p-5 font-body text-sm text-ink/60">
          Log your weight to see your trend. Just a number — the moving average smooths the daily noise.
        </p>
      )}

      <div>
        <h2 className="mb-3 text-2xl text-ink">Log</h2>
        <BodyLogForm />
      </div>
    </div>
  );
}

function Sparkline({ trend }: { trend: { avgKg: number }[] }) {
  if (trend.length < 2) return null;
  const vals = trend.map((t) => t.avgKg);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 280;
  const h = 60;
  const pts = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke="#e10600" strokeWidth="2" />
    </svg>
  );
}
