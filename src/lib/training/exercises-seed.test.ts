import { describe, it, expect } from "vitest";
import { EXERCISE_LIBRARY, TRACKING_TYPES } from "@/lib/training/exercises-seed";

describe("exercise library seed", () => {
  it("ships a broad library (~150)", () => {
    expect(EXERCISE_LIBRARY.length).toBeGreaterThanOrEqual(140);
  });

  it("has no duplicate names (case-insensitive) — the DB enforces a unique global index", () => {
    const seen = new Set<string>();
    for (const e of EXERCISE_LIBRARY) {
      const key = e.name.trim().toLowerCase();
      expect(seen.has(key), `duplicate exercise: ${e.name}`).toBe(false);
      seen.add(key);
    }
  });

  it("every exercise is fully tagged with valid values", () => {
    for (const e of EXERCISE_LIBRARY) {
      expect(e.name.trim().length, `empty name`).toBeGreaterThan(0);
      expect(e.muscles.length, `${e.name} has no muscle group`).toBeGreaterThan(0);
      expect(e.pattern.trim().length, `${e.name} has no pattern`).toBeGreaterThan(0);
      expect(e.equipment.trim().length, `${e.name} has no equipment`).toBeGreaterThan(0);
      expect(TRACKING_TYPES, `${e.name} tracking`).toContain(e.tracking);
    }
  });

  it("covers the major muscle groups and all tracking types", () => {
    const muscles = new Set(EXERCISE_LIBRARY.flatMap((e) => e.muscles));
    for (const m of ["chest", "back", "quads", "hamstrings", "glutes", "shoulders", "biceps", "triceps", "core", "calves"]) {
      expect(muscles.has(m), `missing coverage: ${m}`).toBe(true);
    }
    const tracking = new Set(EXERCISE_LIBRARY.map((e) => e.tracking));
    for (const t of TRACKING_TYPES) expect(tracking.has(t), `no exercise uses tracking ${t}`).toBe(true);
  });
});
