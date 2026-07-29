import { describe, it, expect } from "vitest";
import { isQuietNow, minutesOfDayInTz, parseTimeToMinutes, minutesToTime } from "@/lib/notifications/quiet";

// A fixed instant: 2026-01-15T02:30:00Z → 02:30 UTC, 21:30 in New York (EST, UTC-5).
const AT = (utc: string) => new Date(utc);

describe("quiet hours", () => {
  it("reads local minutes-of-day in a timezone", () => {
    expect(minutesOfDayInTz(AT("2026-01-15T02:30:00Z"), "UTC")).toBe(150); // 02:30
    expect(minutesOfDayInTz(AT("2026-01-15T02:30:00Z"), "America/New_York")).toBe(21 * 60 + 30); // 21:30 EST
  });

  it("is off when start or end is null", () => {
    expect(isQuietNow({ start: null, end: 420, timezone: "UTC" }, AT("2026-01-15T02:30:00Z"))).toBe(false);
    expect(isQuietNow({ start: 1320, end: null, timezone: "UTC" }, AT("2026-01-15T02:30:00Z"))).toBe(false);
  });

  it("handles an overnight window (22:00 → 07:00)", () => {
    const win = { start: 22 * 60, end: 7 * 60, timezone: "UTC" };
    expect(isQuietNow(win, AT("2026-01-15T02:30:00Z"))).toBe(true); // 02:30 → quiet
    expect(isQuietNow(win, AT("2026-01-15T23:00:00Z"))).toBe(true); // 23:00 → quiet
    expect(isQuietNow(win, AT("2026-01-15T12:00:00Z"))).toBe(false); // noon → awake
    expect(isQuietNow(win, AT("2026-01-15T07:00:00Z"))).toBe(false); // end is exclusive
  });

  it("handles a same-day window (13:00 → 14:00)", () => {
    const win = { start: 13 * 60, end: 14 * 60, timezone: "UTC" };
    expect(isQuietNow(win, AT("2026-01-15T13:30:00Z"))).toBe(true);
    expect(isQuietNow(win, AT("2026-01-15T15:00:00Z"))).toBe(false);
  });

  it("respects the client's timezone for the same instant", () => {
    // 02:30 UTC is 21:30 in New York — inside a 22:00→07:00 window in UTC but not NY.
    const win = (tz: string) => ({ start: 22 * 60, end: 7 * 60, timezone: tz });
    expect(isQuietNow(win("UTC"), AT("2026-01-15T02:30:00Z"))).toBe(true);
    expect(isQuietNow(win("America/New_York"), AT("2026-01-15T02:30:00Z"))).toBe(false); // 21:30 NY
  });

  it("treats a zero-length window as off", () => {
    expect(isQuietNow({ start: 600, end: 600, timezone: "UTC" }, AT("2026-01-15T10:00:00Z"))).toBe(false);
  });

  it("parses and formats HH:MM", () => {
    expect(parseTimeToMinutes("22:00")).toBe(1320);
    expect(parseTimeToMinutes("7:05")).toBe(425);
    expect(parseTimeToMinutes("")).toBeNull();
    expect(parseTimeToMinutes("25:00")).toBeNull();
    expect(minutesToTime(1320)).toBe("22:00");
    expect(minutesToTime(null)).toBe("");
  });
});
