import { describe, it, expect } from "vitest";
import { e1rm, toLb, exerciseNames, historyFor, personalBests, isE1rmPr, type LiftEntry } from "@/lib/lifts/progress";

const mk = (id: string, exercise: string, weight: number, reps: number, date: string, unit: "lb" | "kg" = "lb"): LiftEntry => ({
  id, exercise, weight, unit, reps, sets: 1, log_date: date,
});

describe("e1rm (Epley)", () => {
  it("returns the weight itself at 1 rep", () => {
    expect(e1rm(225, 1)).toBe(225);
  });
  it("estimates higher for more reps", () => {
    expect(e1rm(200, 5)).toBe(233); // 200 * (1 + 5/30) = 233.3
    expect(e1rm(200, 10)).toBeGreaterThan(e1rm(200, 5));
  });
  it("is zero for non-positive weight", () => {
    expect(e1rm(0, 5)).toBe(0);
  });
});

describe("toLb", () => {
  it("converts kg to lb, leaves lb alone", () => {
    expect(toLb(100, "lb")).toBe(100);
    expect(toLb(100, "kg")).toBe(220.5);
  });
});

describe("exerciseNames / historyFor", () => {
  const entries = [
    mk("1", "Bench", 185, 5, "2026-08-01"),
    mk("2", "Squat", 275, 5, "2026-08-03"),
    mk("3", "Bench", 195, 5, "2026-08-05"),
  ];
  it("lists distinct exercises, most recent first", () => {
    expect(exerciseNames(entries)).toEqual(["Bench", "Squat"]);
  });
  it("returns one exercise's history oldest-first", () => {
    expect(historyFor(entries, "Bench").map((e) => e.id)).toEqual(["1", "3"]);
  });
});

describe("personalBests", () => {
  it("tracks top weight and best e1RM per exercise", () => {
    const entries = [
      mk("1", "Bench", 185, 5, "2026-08-01"),
      mk("2", "Bench", 205, 1, "2026-08-05"),
      mk("3", "Bench", 195, 8, "2026-08-08"),
    ];
    const [bench] = personalBests(entries);
    expect(bench.exercise).toBe("Bench");
    expect(bench.topWeightLb).toBe(205);
    expect(bench.bestE1rmLb).toBe(e1rm(195, 8)); // 195*(1+8/30)=247 > 205 > 216
    expect(bench.entryCount).toBe(3);
    expect(bench.lastDate).toBe("2026-08-08");
  });
});

describe("isE1rmPr", () => {
  const prior = [mk("1", "Deadlift", 315, 3, "2026-08-01")];
  it("flags a new best", () => {
    expect(isE1rmPr(mk("2", "Deadlift", 365, 3, "2026-08-08"), prior)).toBe(true);
  });
  it("does not flag a lesser lift", () => {
    expect(isE1rmPr(mk("3", "Deadlift", 315, 1, "2026-08-08"), prior)).toBe(false);
  });
});
