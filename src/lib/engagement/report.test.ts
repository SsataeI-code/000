import { describe, it, expect } from "vitest";
import { shouldSendWeeklyReport } from "@/lib/engagement/report";

// 2026-08-03 is a Monday; 2026-08-04 a Tuesday; 2026-07-27 the prior Monday.
describe("shouldSendWeeklyReport", () => {
  it("fires on Monday with no prior report", () => {
    expect(shouldSendWeeklyReport("2026-08-03", null)).toBe(true);
  });

  it("does not fire on a non-report day", () => {
    expect(shouldSendWeeklyReport("2026-08-04", null)).toBe(false);
  });

  it("does not fire twice in the same week", () => {
    // Somehow run again the same Monday.
    expect(shouldSendWeeklyReport("2026-08-03", "2026-08-03")).toBe(false);
  });

  it("fires again the next Monday (>=6 days later)", () => {
    expect(shouldSendWeeklyReport("2026-08-03", "2026-07-27")).toBe(true);
  });

  it("honors a custom report day", () => {
    // 2026-08-02 is a Sunday (0).
    expect(shouldSendWeeklyReport("2026-08-02", null, 0)).toBe(true);
    expect(shouldSendWeeklyReport("2026-08-03", null, 0)).toBe(false);
  });

  it("returns false for a malformed date", () => {
    expect(shouldSendWeeklyReport("not-a-date", null)).toBe(false);
  });
});
