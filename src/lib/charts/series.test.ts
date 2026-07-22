import { describe, expect, it } from "vitest";
import {
  lastNDates,
  dailyCalories,
  dailyConsistency,
  seriesMean,
  averageSeries,
  daysLogged,
} from "@/lib/charts/series";
import type { FoodLog, Habit } from "@/lib/types/db";

const day = (d: string) => new Date(`${d}T00:00:00Z`);

function food(over: Partial<FoodLog>): FoodLog {
  return {
    id: "x", client_id: "c", log_date: "2026-01-01", logged_at: "", barcode: null,
    name: "f", brand: null, grams: null, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
    nutriments: null, source: "manual", photo_path: null, created_at: "", ...over,
  };
}

function habit(over: Partial<Habit>): Habit {
  return {
    id: "h", client_id: "c", name: "n", category: "movement", type: "checkbox",
    target: null, unit: null, cadence: "daily", times_per_week: null, days_of_week: null,
    reminder_time: null, why: null, anchor: null, position: 0, active: true,
    created_by: null, created_at: "", updated_at: "", ...over,
  };
}

describe("chart series", () => {
  it("lastNDates returns n ascending dates ending today", () => {
    const dates = lastNDates(3, day("2026-01-10"));
    expect(dates).toEqual(["2026-01-08", "2026-01-09", "2026-01-10"]);
  });

  it("dailyCalories sums per day and zero-fills empty days", () => {
    const dates = lastNDates(3, day("2026-01-03"));
    const logs = [
      food({ log_date: "2026-01-01", calories: 300 }),
      food({ log_date: "2026-01-01", calories: 200 }),
      food({ log_date: "2026-01-03", calories: 150 }),
    ];
    expect(dailyCalories(logs, dates).map((p) => p.value)).toEqual([500, 0, 150]);
  });

  it("dailyConsistency is completed ÷ due, cadence-aware, null when nothing due", () => {
    const dates = ["2026-01-05"]; // 2026-01-05 is a Monday (getUTCDay = 1)
    const daily = habit({ id: "a", cadence: "daily" });
    const monOnly = habit({ id: "b", cadence: "specific_days", days_of_week: [1] });
    const sunOnly = habit({ id: "c", cadence: "specific_days", days_of_week: [0] });
    const completed = new Map([["a", new Set(["2026-01-05"])]]); // only 'a' done
    // Due on Monday: a + b (2). Done: a (1). sunOnly not due. => 0.5
    expect(dailyConsistency([daily, monOnly, sunOnly], completed, dates)[0].value).toBe(0.5);
    // Nothing due -> null
    expect(dailyConsistency([sunOnly], new Map(), dates)[0].value).toBeNull();
  });

  it("seriesMean ignores nulls; averageSeries averages point-by-point", () => {
    expect(seriesMean([{ date: "a", value: 2 }, { date: "b", value: null }, { date: "c", value: 4 }])).toBe(3);
    const dates = ["d1", "d2"];
    const avg = averageSeries(
      [[{ date: "d1", value: 10 }, { date: "d2", value: null }], [{ date: "d1", value: 20 }, { date: "d2", value: 4 }]],
      dates,
    );
    expect(avg.map((p) => p.value)).toEqual([15, 4]);
  });

  it("daysLogged counts days with a positive value", () => {
    expect(daysLogged([{ date: "a", value: 500 }, { date: "b", value: 0 }, { date: "c", value: 200 }])).toBe(2);
  });
});
