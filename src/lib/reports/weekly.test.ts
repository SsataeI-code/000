import { describe, it, expect } from "vitest";
import { clientWeeklyRecap, coachDigest, type DigestClient } from "@/lib/reports/weekly";
import type { AttentionFlag } from "@/lib/coach/attention";

const SHAMING = /\b(fail(ed|ure)?|lazy|bad|should have|shouldn't|disappoint|guilt|pathetic|worthless)\b/i;

describe("clientWeeklyRecap", () => {
  it("always returns at least one win and one focus", () => {
    const r = clientWeeklyRecap({
      habitConsistency: 0,
      perfectDays: 0,
      daysLoggedFood: 0,
      currentStreak: 0,
      weightChangeLb: null,
      goal: null,
    });
    expect(r.wins.length).toBeGreaterThanOrEqual(1);
    expect(r.focus.length).toBeGreaterThanOrEqual(1);
  });

  it("celebrates a strong week", () => {
    const r = clientWeeklyRecap({
      habitConsistency: 0.9,
      perfectDays: 3,
      daysLoggedFood: 7,
      currentStreak: 12,
      weightChangeLb: -1.1,
      goal: "lose",
    });
    expect(r.wins.some((w) => w.includes("perfect"))).toBe(true);
    expect(r.wins.some((w) => w.includes("90%"))).toBe(true);
    expect(r.wins.some((w) => w.toLowerCase().includes("down 1.1 lb"))).toBe(true);
    expect(r.wins.length).toBeLessThanOrEqual(4);
  });

  it("gives forgiving focus for a rough week and caps at 3", () => {
    const r = clientWeeklyRecap({
      habitConsistency: 0.3,
      perfectDays: 0,
      daysLoggedFood: 2,
      currentStreak: 0,
      weightChangeLb: 0.8,
      goal: "lose",
    });
    expect(r.focus.length).toBeGreaterThanOrEqual(1);
    expect(r.focus.length).toBeLessThanOrEqual(3);
  });

  it("never shames, even on the worst week", () => {
    const r = clientWeeklyRecap({
      habitConsistency: 0,
      perfectDays: 0,
      daysLoggedFood: 0,
      currentStreak: 0,
      weightChangeLb: 3,
      goal: "lose",
    });
    for (const line of [...r.wins, ...r.focus]) expect(line).not.toMatch(SHAMING);
  });
});

describe("coachDigest", () => {
  const flag = (label: string, severity: number): AttentionFlag => ({ kind: "quiet", label, severity });
  const clients: DigestClient[] = [
    { name: "Ada", goal: "lose", daysSinceActivity: 0, weightChangeLb: -0.9, currentStreak: 9, flags: [] },
    { name: "Ben", goal: "lose", daysSinceActivity: 12, weightChangeLb: 1.2, currentStreak: 0, flags: [flag("Silent 12d", 60), flag("No food log 5d", 25)] },
    { name: "Cy", goal: "gain", daysSinceActivity: 2, weightChangeLb: 0.7, currentStreak: 1, flags: [] },
  ];

  it("counts active-this-week and totals", () => {
    const d = coachDigest(clients);
    expect(d.total).toBe(3);
    expect(d.activeThisWeek).toBe(2); // Ada + Cy
  });

  it("celebrates streaks and toward-goal weight moves", () => {
    const d = coachDigest(clients);
    expect(d.celebrate.some((c) => c.includes("Ada") && c.includes("streak"))).toBe(true);
    expect(d.celebrate.some((c) => c.includes("Cy") && c.includes("up 0.7 lb"))).toBe(true);
  });

  it("ranks needs-you by total severity and surfaces the top flag reason", () => {
    const d = coachDigest(clients);
    expect(d.needsYou[0]?.name).toBe("Ben");
    expect(d.needsYou[0]?.reason).toBe("Silent 12d");
    expect(d.needsYou).toHaveLength(1); // only Ben is flagged
  });
});
