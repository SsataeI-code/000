import { describe, expect, it } from "vitest";
import { classifySlip, draftNudge } from "@/lib/coach/slip";
import type { AttentionFlag } from "@/lib/coach/attention";

const flag = (kind: AttentionFlag["kind"], severity: number): AttentionFlag => ({ kind, label: kind, severity });

describe("slip classification", () => {
  it("no flags → none", () => {
    expect(classifySlip([], 0).level).toBe("none");
  });

  it("a single mild slip → nudge", () => {
    expect(classifySlip([flag("missed_habits", 20)], 20).level).toBe("nudge");
    expect(classifySlip([flag("no_food", 25)], 25).level).toBe("nudge");
    expect(classifySlip([flag("quiet", 30)], 30).level).toBe("nudge"); // quiet 3-6d is soft
  });

  it("a silent week (hard quiet) → escalate", () => {
    expect(classifySlip([flag("quiet", 60)], 60).level).toBe("escalate");
  });

  it("weight off-track → escalate (a real conversation)", () => {
    expect(classifySlip([flag("weight_off", 22)], 22).level).toBe("escalate");
  });

  it("multiple flags at once → escalate", () => {
    const d = classifySlip([flag("no_food", 25), flag("missed_habits", 20)], 45);
    expect(d.level).toBe("escalate");
    expect(d.primary).toBe("no_food"); // most severe first
  });

  it("picks the single flag as the nudge's primary", () => {
    expect(classifySlip([flag("no_food", 25)], 25).primary).toBe("no_food");
  });
});

describe("nudge drafting", () => {
  it("is warm, personalized, and per-slip", () => {
    expect(draftNudge("Alex Kim", "no_food")).toContain("Alex");
    expect(draftNudge("Alex", "missed_habits")).toMatch(/habit/i);
    expect(draftNudge(null, "quiet")).toContain("there"); // graceful fallback name
  });

  it("never shames (no negative framing words)", () => {
    for (const k of ["no_food", "missed_habits", "quiet", "weight_off"] as const) {
      const msg = draftNudge("Sam", k).toLowerCase();
      expect(msg).not.toMatch(/lazy|failed|behind|disappoint|should have/);
    }
  });
});
