import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getClientProfile } from "@/lib/nutrition/data";
import { dayInTimeZone } from "@/lib/time/day";
import { getThisWeekCheckin, getCheckins } from "@/lib/checkin/data";
import { CheckInForm } from "@/components/checkin/CheckInForm";
import { kgToLb } from "@/lib/body/trend";

export const dynamic = "force-dynamic";

const ENERGY_LABEL = ["", "Drained", "Low", "OK", "Good", "Great"];

export default async function ClientCheckinPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const profile = await getClientProfile(user.id);
  const today = dayInTimeZone(profile?.timezone);
  const [thisWeek, history] = await Promise.all([getThisWeekCheckin(user.id, today), getCheckins(user.id, 8)]);
  const past = history.filter((c) => c.id !== thisWeek?.id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Weekly</p>
          <h1 className="mt-1 text-4xl text-ink">Check-in</h1>
        </div>
        <Link href="/client" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">Done</Link>
      </div>

      <p className="font-body text-sm text-ink/60">A quick weekly pulse — your weight, how the week felt, a win, and one thing to work on. Your coach reads it to help.</p>

      <CheckInForm existing={thisWeek} />

      {past.length > 0 ? (
        <section className="flex flex-col gap-2">
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Past check-ins</p>
          <ul className="flex flex-col gap-2">
            {past.map((c) => (
              <li key={c.id} className="rounded-2xl border border-hairline bg-surface shadow-card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-label text-[11px] uppercase tracking-wide text-ink/50">Week of {c.week_start}</span>
                  <span className="shrink-0 font-body text-xs text-ink/50">
                    {c.weight_kg != null ? `${kgToLb(c.weight_kg)} lb` : ""}
                    {c.energy ? ` · ${ENERGY_LABEL[c.energy]}` : ""}
                  </span>
                </div>
                {c.win ? <p className="mt-1 font-body text-sm text-ink/85"><span className="text-success">Win:</span> {c.win}</p> : null}
                {c.focus ? <p className="font-body text-sm text-ink/85"><span className="text-red">Focus:</span> {c.focus}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
