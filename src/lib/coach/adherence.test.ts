import { describe, it, expect } from "vitest";
import { computeAdherence, adherenceBand } from "@/lib/coach/adherence";

describe("computeAdherence", () => {
  it("weights the three signals (40/35/25)", () => {
    expect(computeAdherence({ habitConsistency: 1, loggedRate: 1, proteinOnTarget: 1 })).toBe(100);
    expect(computeAdherence({ habitConsistency: 0, loggedRate: 0, proteinOnTarget: 0 })).toBe(0);
    // 0.5 habit, 1 logged, 0 protein → (0.5*.4 + 1*.35 + 0*.25) = 0.55
    expect(computeAdherence({ habitConsistency: 0.5, loggedRate: 1, proteinOnTarget: 0 })).toBe(55);
  });

  it("re-weights when a signal is missing", () => {
    // only habits present → score is just habit consistency
    expect(computeAdherence({ habitConsistency: 0.7 })).toBe(70);
    // habits + logging (no protein) → (0.4*1 + 0.35*0)/(0.75) = 0.533
    expect(computeAdherence({ habitConsistency: 1, loggedRate: 0 })).toBe(53);
  });

  it("returns null with no signal", () => {
    expect(computeAdherence({})).toBeNull();
  });

  it("clamps out-of-range inputs", () => {
    expect(computeAdherence({ habitConsistency: 2, loggedRate: -1 })).toBe(53); // 1 & 0 re-weighted
  });

  it("bands a score", () => {
    expect(adherenceBand(90).tone).toBe("success");
    expect(adherenceBand(60).tone).toBe("warn");
    expect(adherenceBand(30).tone).toBe("risk");
    expect(adherenceBand(null).label).toBe("No data");
  });
});
