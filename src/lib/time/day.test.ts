import { describe, it, expect } from "vitest";
import { dayInTimeZone, daysBetweenIso } from "@/lib/time/day";

describe("dayInTimeZone", () => {
  it("returns the local calendar day, not UTC, across the boundary", () => {
    // 01:30 UTC on Aug 20 is still Aug 19 (21:30) in New York.
    const t = new Date("2026-08-20T01:30:00Z");
    expect(dayInTimeZone("America/New_York", t)).toBe("2026-08-19");
    expect(dayInTimeZone("UTC", t)).toBe("2026-08-20");
  });

  it("handles a timezone ahead of UTC", () => {
    // 22:30 UTC on Aug 19 is already Aug 20 in Tokyo (07:30).
    const t = new Date("2026-08-19T22:30:00Z");
    expect(dayInTimeZone("Asia/Tokyo", t)).toBe("2026-08-20");
  });

  it("falls back to UTC for a bad timezone", () => {
    const t = new Date("2026-08-20T01:30:00Z");
    expect(dayInTimeZone("Not/AZone", t)).toBe("2026-08-20");
    expect(dayInTimeZone(null, t)).toBe("2026-08-20");
  });
});

describe("daysBetweenIso", () => {
  it("counts whole calendar days", () => {
    expect(daysBetweenIso("2026-08-20", "2026-08-19")).toBe(1);
    expect(daysBetweenIso("2026-08-19", "2026-08-19")).toBe(0);
    expect(daysBetweenIso("2026-08-19", "2026-08-26")).toBe(-7);
  });
});
