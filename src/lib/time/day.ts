/**
 * The calendar day in a client's own timezone (§2 reliability — daily stats must
 * reset at the client's local midnight, not the server's UTC midnight). The
 * server runs in UTC, so "today" has to be computed against the client's stored
 * IANA timezone or a slip logged at 9pm ET would count toward the wrong day.
 */

/** "YYYY-MM-DD" for `now` as seen in `timeZone` (IANA). Falls back to UTC. */
export function dayInTimeZone(timeZone: string | null | undefined, now: Date = new Date()): string {
  try {
    // en-CA formats as YYYY-MM-DD, which is exactly the shape we store.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    // Unknown/invalid timezone → UTC, so we still return a sane date.
    return now.toISOString().slice(0, 10);
  }
}

/** Days between two YYYY-MM-DD calendar dates (a − b), ignoring time of day. */
export function daysBetweenIso(a: string, b: string): number {
  const ms = Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`);
  if (!Number.isFinite(ms)) return 0;
  return Math.round(ms / 86_400_000);
}
