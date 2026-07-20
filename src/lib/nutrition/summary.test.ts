import { describe, expect, it } from "vitest";
import { isOnboarded, todayIso, totalMacros } from "@/lib/nutrition/summary";
import type { ClientProfile, FoodLog, NutritionTargetRow } from "@/lib/types/db";

function log(partial: Partial<FoodLog>): FoodLog {
  return {
    id: "x",
    client_id: "c",
    log_date: "2026-07-20",
    logged_at: "2026-07-20T10:00:00Z",
    barcode: null,
    name: "Food",
    brand: null,
    grams: null,
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    nutriments: null,
    source: "manual",
    photo_path: null,
    created_at: "2026-07-20T10:00:00Z",
    ...partial,
  };
}

describe("nutrition summary", () => {
  it("sums macros across logs", () => {
    const total = totalMacros([
      log({ calories: 200, protein_g: 20, carbs_g: 10, fat_g: 5 }),
      log({ calories: 350, protein_g: 15, carbs_g: 40, fat_g: 12 }),
    ]);
    expect(total).toEqual({ calories: 550, proteinG: 35, carbsG: 50, fatG: 17 });
  });

  it("returns zeros for an empty day (never NaN)", () => {
    expect(totalMacros([])).toEqual({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });

  it("coerces string/garbage numeric fields defensively", () => {
    const total = totalMacros([
      // Supabase numeric columns can arrive as strings.
      log({ calories: 100, protein_g: "12.5" as unknown as number }),
    ]);
    expect(total.proteinG).toBe(12.5);
    expect(Number.isNaN(total.proteinG)).toBe(false);
  });

  it("formats today's date as YYYY-MM-DD", () => {
    expect(todayIso(new Date("2026-07-20T23:15:00Z"))).toBe("2026-07-20");
  });

  it("treats a client as onboarded only with both a profile timestamp and targets", () => {
    const profile = { onboarded_at: "2026-07-20T00:00:00Z" } as ClientProfile;
    const targets = { calories: 2000 } as NutritionTargetRow;
    expect(isOnboarded(profile, targets)).toBe(true);
    expect(isOnboarded(profile, null)).toBe(false);
    expect(isOnboarded({ onboarded_at: null } as ClientProfile, targets)).toBe(false);
    expect(isOnboarded(null, targets)).toBe(false);
  });
});
