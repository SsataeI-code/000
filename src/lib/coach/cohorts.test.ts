import { describe, expect, it } from "vitest";
import { segmentRoster, type CohortClient } from "@/lib/coach/cohorts";

function client(over: Partial<CohortClient>): CohortClient {
  return {
    goal: "maintain",
    sex: null,
    age: null,
    activity: null,
    bodyFatPct: null,
    lastWeightKg: null,
    daysSinceActivity: 0,
    flags: [],
    ...over,
  };
}

describe("cohort segmentation", () => {
  it("groups by goal and counts members", () => {
    const segs = segmentRoster(
      [client({ goal: "lose" }), client({ goal: "lose" }), client({ goal: "gain" })],
      "goal",
    );
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({ key: "lose", count: 2, label: "Fat loss" });
    expect(segs[1]).toMatchObject({ key: "gain", count: 1 });
  });

  it("orders segments largest-first", () => {
    const segs = segmentRoster(
      [client({ sex: "male" }), client({ sex: "female" }), client({ sex: "female" })],
      "sex",
    );
    expect(segs.map((s) => s.key)).toEqual(["female", "male"]);
  });

  it("omits clients with no value for the dimension", () => {
    const segs = segmentRoster([client({ sex: null }), client({ sex: "male" })], "sex");
    expect(segs).toHaveLength(1);
    expect(segs[0].count).toBe(1);
  });

  it("buckets age into bands", () => {
    const segs = segmentRoster(
      [client({ age: 22 }), client({ age: 30 }), client({ age: 34 }), client({ age: 60 })],
      "age",
    );
    const byKey = Object.fromEntries(segs.map((s) => [s.key, s.count]));
    expect(byKey["u25"]).toBe(1);
    expect(byKey["25_34"]).toBe(2);
    expect(byKey["55p"]).toBe(1);
  });

  it("averages weight (lb) and body-fat within a segment, skipping nulls", () => {
    const segs = segmentRoster(
      [
        client({ goal: "lose", lastWeightKg: 100, bodyFatPct: 30 }),
        client({ goal: "lose", lastWeightKg: 100, bodyFatPct: null }),
        client({ goal: "lose", lastWeightKg: null, bodyFatPct: 20 }),
      ],
      "goal",
    );
    // Weight avg over the two with weights: 100kg → ~221 lb.
    expect(segs[0].avgWeightLb).toBe(221);
    // Body-fat avg over the two with values: (30 + 20) / 2 = 25.
    expect(segs[0].avgBodyFatPct).toBe(25);
  });

  it("counts active-today and flagged per segment", () => {
    const segs = segmentRoster(
      [
        client({ goal: "gain", daysSinceActivity: 0, flags: [] }),
        client({ goal: "gain", daysSinceActivity: 3, flags: ["quiet"] }),
      ],
      "goal",
    );
    expect(segs[0]).toMatchObject({ count: 2, activeToday: 1, flagged: 1 });
  });

  it("returns no segments for an empty roster", () => {
    expect(segmentRoster([], "goal")).toEqual([]);
  });
});
