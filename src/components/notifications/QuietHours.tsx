"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveQuietHoursAction } from "@/lib/notifications/actions";
import { parseTimeToMinutes, minutesToTime } from "@/lib/notifications/quiet";

/**
 * Client sets their quiet hours (§10). While it's quiet, we hold the push buzz;
 * the notification still lands in their inbox, so nothing is missed. The
 * browser's timezone is captured on save so the server evaluates the window in
 * the client's own local time.
 */
export function QuietHours({
  initialStart,
  initialEnd,
  initialTimezone,
}: {
  initialStart: number | null;
  initialEnd: number | null;
  initialTimezone: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [on, setOn] = useState(initialStart != null && initialEnd != null);
  const [from, setFrom] = useState(minutesToTime(initialStart) || "22:00");
  const [to, setTo] = useState(minutesToTime(initialEnd) || "07:00");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;

  function save(enabled: boolean) {
    setError(null);
    setStatus(null);
    const startMin = enabled ? parseTimeToMinutes(from) : null;
    const endMin = enabled ? parseTimeToMinutes(to) : null;
    if (enabled && (startMin == null || endMin == null)) {
      setError("Enter a valid start and end time.");
      return;
    }
    start(async () => {
      const res = await saveQuietHoursAction(startMin, endMin, enabled ? tz : initialTimezone);
      if (res.error) setError(res.error);
      else {
        setStatus(enabled ? "Quiet hours on." : "Quiet hours off.");
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded-lg border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl text-ink">Quiet hours</h2>
          <p className="mt-1 font-body text-sm text-ink/60">
            Hold notifications overnight. They&apos;ll still be waiting for you in the morning.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Quiet hours"
          onClick={() => {
            const next = !on;
            setOn(next);
            save(next);
          }}
          className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
            on ? "border-red bg-red" : "border-hairline bg-surface-muted"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-6" : "left-0.5"}`}
          />
        </button>
      </div>

      {on ? (
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-label text-[11px] uppercase tracking-wide text-ink/60">From</span>
            <input
              type="time"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="min-h-tap rounded-lg border border-hairline bg-surface-muted px-3 py-2 font-body text-base text-ink focus:border-ink"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-label text-[11px] uppercase tracking-wide text-ink/60">To</span>
            <input
              type="time"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="min-h-tap rounded-lg border border-hairline bg-surface-muted px-3 py-2 font-body text-base text-ink focus:border-ink"
            />
          </label>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={pending}
            className="min-h-tap bg-red px-4 py-2 font-label text-xs font-600 uppercase tracking-wide text-white hover:bg-red-ink disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      ) : null}

      <p aria-live="polite" className="mt-3 font-body text-xs text-ink/50">
        {error ? <span className="text-red-ink">{error}</span> : status ? status : tz ? `Your timezone: ${tz}` : null}
      </p>
    </section>
  );
}
