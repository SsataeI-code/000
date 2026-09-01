import type { WearableDay } from "@/lib/wearables/data";

function fmtDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function fmtSleep(min: number): string {
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

/**
 * Coach-facing wearable summary (§7/§9 — health data the coach steers). Renders
 * recent synced steps/sleep; the caller only mounts it when there are rows, so
 * it never shows an empty shell before a client connects a tracker.
 */
export function WearableSummary({ days }: { days: WearableDay[] }) {
  return (
    <section aria-label="Wearable data" className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface shadow-card p-5">
      <h2 className="text-2xl text-ink">Tracker</h2>
      <ul className="flex flex-col divide-y divide-hairline">
        {days.map((d) => (
          <li key={`${d.provider}-${d.day}`} className="flex items-center justify-between gap-3 py-2">
            <span className="font-body text-sm text-ink/70">{fmtDay(d.day)}</span>
            <span className="flex items-center gap-4">
              <span className="font-body text-sm text-ink">
                {d.steps != null ? `${d.steps.toLocaleString()} steps` : "—"}
              </span>
              <span className="font-body text-sm text-ink/60">{d.sleepMinutes != null ? fmtSleep(d.sleepMinutes) : "—"}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
