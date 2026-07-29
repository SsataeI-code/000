/**
 * Quiet hours (§10). Pure and tested. Given a client's window (minutes past
 * local midnight) and their timezone, decide whether *now* falls inside it —
 * handling the common overnight case (e.g. 22:00 → 07:00) where the window wraps
 * past midnight. Used to suppress the push buzz; the in-app record still lands.
 */

export interface QuietWindow {
  /** Start, minutes past local midnight (0–1439), or null when quiet hours are off. */
  start: number | null;
  /** End, minutes past local midnight (0–1439), or null when quiet hours are off. */
  end: number | null;
  /** IANA timezone (e.g. "America/New_York"); falls back to UTC when unknown. */
  timezone: string | null;
}

/** Minutes past midnight for `date` as seen in `timezone` (defaults to UTC). */
export function minutesOfDayInTz(date: Date, timezone: string | null): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(date);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return ((hour % 24) * 60 + minute) % 1440;
  } catch {
    // Unknown timezone → treat as UTC so we still make a sane decision.
    return (date.getUTCHours() * 60 + date.getUTCMinutes()) % 1440;
  }
}

/** True when `now` is inside the client's quiet window. Off/degenerate → false. */
export function isQuietNow(win: QuietWindow, now: Date = new Date()): boolean {
  const { start, end } = win;
  if (start == null || end == null) return false;
  if (start === end) return false; // zero-length window = off
  const m = minutesOfDayInTz(now, win.timezone);
  return start < end
    ? m >= start && m < end // same-day window
    : m >= start || m < end; // overnight window wraps past midnight
}

/** Parse an "HH:MM" input into minutes past midnight, or null when blank/invalid. */
export function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const min = Number(match[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Format minutes past midnight back to "HH:MM" for a time input. */
export function minutesToTime(mins: number | null): string {
  if (mins == null) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
