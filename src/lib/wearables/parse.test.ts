import { describe, it, expect } from "vitest";
import {
  parseOuraActivity,
  parseOuraSleep,
  parseFitbitSteps,
  parseFitbitSleep,
  mergeMetrics,
} from "@/lib/wearables/parse";

describe("wearable parsers", () => {
  it("parses Oura steps and skips malformed rows", () => {
    const json = { data: [{ day: "2026-08-03", steps: 8200 }, { day: "bad", steps: 5 }, { day: "2026-08-04" }] };
    expect(parseOuraActivity(json)).toEqual([{ day: "2026-08-03", steps: 8200 }]);
  });

  it("converts Oura sleep seconds to minutes", () => {
    const json = { data: [{ day: "2026-08-03", total_sleep_duration: 27000 }] }; // 450 min
    expect(parseOuraSleep(json)).toEqual([{ day: "2026-08-03", sleepMinutes: 450 }]);
  });

  it("parses Fitbit steps (string values) and sleep", () => {
    expect(parseFitbitSteps({ "activities-steps": [{ dateTime: "2026-08-03", value: "10345" }] })).toEqual([
      { day: "2026-08-03", steps: 10345 },
    ]);
    expect(parseFitbitSleep({ sleep: [{ dateOfSleep: "2026-08-03", minutesAsleep: 402 }] })).toEqual([
      { day: "2026-08-03", sleepMinutes: 402 },
    ]);
  });

  it("returns [] for garbage or missing keys, never throws", () => {
    expect(parseOuraActivity(null)).toEqual([]);
    expect(parseFitbitSteps({})).toEqual([]);
    expect(parseFitbitSleep("nope")).toEqual([]);
    expect(parseOuraSleep({ data: "x" })).toEqual([]);
  });

  it("merges steps + sleep into one row per day, sorted", () => {
    const merged = mergeMetrics(
      [{ day: "2026-08-04", steps: 9000 }, { day: "2026-08-03", steps: 8200 }],
      [{ day: "2026-08-03", sleepMinutes: 450 }],
    );
    expect(merged).toEqual([
      { day: "2026-08-03", steps: 8200, sleepMinutes: 450 },
      { day: "2026-08-04", steps: 9000 },
    ]);
  });
});
