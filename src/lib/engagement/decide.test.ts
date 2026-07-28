import { describe, expect, it } from "vitest";
import { decideEngagement, type EngagementState } from "@/lib/engagement/decide";

const fresh: EngagementState = { lastActivityOn: null, coachAlerted: false, emailedThreshold: 0, lastNudgeOn: null };

describe("engagement sweep decisions", () => {
  it("does nothing for a client who has never been active", () => {
    const d = decideEngagement({ today: "2026-02-10", lastActivityOn: null, daysSinceActivity: Infinity, slipLevel: "nudge", state: fresh });
    expect(d).toMatchObject({ sendNudge: false, alertCoach: false, emailDay: null });
  });

  it("auto-nudges a small slip, then respects the cooldown", () => {
    const state: EngagementState = { lastActivityOn: "2026-02-08", coachAlerted: false, emailedThreshold: 0, lastNudgeOn: null };
    const first = decideEngagement({ today: "2026-02-10", lastActivityOn: "2026-02-08", daysSinceActivity: 2, slipLevel: "nudge", state });
    expect(first.sendNudge).toBe(true);
    expect(first.nextState.lastNudgeOn).toBe("2026-02-10");
    // Next day: still within cooldown → no repeat nudge.
    const next = decideEngagement({ today: "2026-02-11", lastActivityOn: "2026-02-08", daysSinceActivity: 3, slipLevel: "nudge", state: first.nextState });
    expect(next.sendNudge).toBe(false);
  });

  it("alerts the coach once at 3 days, not again the next day", () => {
    const s: EngagementState = { lastActivityOn: "2026-02-07", coachAlerted: false, emailedThreshold: 0, lastNudgeOn: null };
    const d3 = decideEngagement({ today: "2026-02-10", lastActivityOn: "2026-02-07", daysSinceActivity: 3, slipLevel: "escalate", state: s });
    expect(d3.alertCoach).toBe(true);
    const d4 = decideEngagement({ today: "2026-02-11", lastActivityOn: "2026-02-07", daysSinceActivity: 4, slipLevel: "escalate", state: d3.nextState });
    expect(d4.alertCoach).toBe(false);
  });

  it("emails at 3, then 5, then 7 — one per stage, never re-sending", () => {
    let s: EngagementState = { lastActivityOn: "2026-02-01", coachAlerted: false, emailedThreshold: 0, lastNudgeOn: null };
    const run = (day: number, date: string) => {
      const d = decideEngagement({ today: date, lastActivityOn: "2026-02-01", daysSinceActivity: day, slipLevel: "escalate", state: s });
      s = d.nextState;
      return d.emailDay;
    };
    expect(run(3, "2026-02-04")).toBe(3);
    expect(run(4, "2026-02-05")).toBeNull();
    expect(run(5, "2026-02-06")).toBe(5);
    expect(run(6, "2026-02-07")).toBeNull();
    expect(run(7, "2026-02-08")).toBe(7);
    expect(run(9, "2026-02-10")).toBeNull(); // ladder exhausted
  });

  it("sends only the highest milestone if the cron missed days (no burst)", () => {
    const s: EngagementState = { lastActivityOn: "2026-02-01", coachAlerted: false, emailedThreshold: 0, lastNudgeOn: null };
    const d = decideEngagement({ today: "2026-02-08", lastActivityOn: "2026-02-01", daysSinceActivity: 7, slipLevel: "escalate", state: s });
    expect(d.emailDay).toBe(7);
  });

  it("resets counters when the client becomes active again (new spell)", () => {
    const spent: EngagementState = { lastActivityOn: "2026-02-01", coachAlerted: true, emailedThreshold: 7, lastNudgeOn: "2026-02-05" };
    // They logged on 02-15; now they've gone quiet again to day 3 on 02-18.
    const d = decideEngagement({ today: "2026-02-18", lastActivityOn: "2026-02-15", daysSinceActivity: 3, slipLevel: "escalate", state: spent });
    expect(d.alertCoach).toBe(true); // fresh spell → coach alerted again
    expect(d.nextState.emailedThreshold).toBe(3); // ladder restarts
  });
});
