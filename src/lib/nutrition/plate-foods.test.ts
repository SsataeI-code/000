import { describe, it, expect } from "vitest";
import {
  PLATE_FOODS,
  PLATE_ZONES,
  plateFoodById,
  foodsByZone,
  selectedTotals,
  zoneCounts,
  plateBalanceHint,
  plateLogName,
  zoneForFood,
} from "@/lib/nutrition/plate-foods";

const pick = (...ids: string[]) => ids.map((id) => plateFoodById(id)!);

describe("plate-foods catalog", () => {
  it("has unique ids and a real icon + positive calories for every food", () => {
    const ids = new Set<string>();
    for (const f of PLATE_FOODS) {
      expect(ids.has(f.id), `duplicate id ${f.id}`).toBe(false);
      ids.add(f.id);
      expect(f.icon.length).toBeGreaterThan(0);
      expect(f.calories).toBeGreaterThan(0);
      expect(f.proteinG).toBeGreaterThanOrEqual(0);
      expect(PLATE_ZONES).toContain(f.zone);
    }
  });

  it("has at least one food in every zone", () => {
    for (const z of PLATE_ZONES) {
      expect(foodsByZone(z).length).toBeGreaterThan(0);
    }
  });

  it("macros are self-consistent with calories (within rounding)", () => {
    for (const f of PLATE_FOODS) {
      const fromMacros = f.proteinG * 4 + f.carbsG * 4 + f.fatG * 9;
      // Allow a generous window — portions round and fiber/alcohol aren't modeled.
      expect(Math.abs(fromMacros - f.calories)).toBeLessThanOrEqual(45);
    }
  });
});

describe("selectedTotals", () => {
  it("is all zero for an empty selection", () => {
    expect(selectedTotals([])).toEqual({ proteinG: 0, carbsG: 0, fatG: 0, calories: 0 });
  });

  it("sums a selection", () => {
    const chicken = plateFoodById("chicken")!;
    const rice = plateFoodById("rice")!;
    const t = selectedTotals(pick("chicken", "rice"));
    expect(t.proteinG).toBe(Math.round(chicken.proteinG + rice.proteinG));
    expect(t.calories).toBe(Math.round(chicken.calories + rice.calories));
  });

  it("counts repeats", () => {
    const one = selectedTotals(pick("chicken")).calories;
    const two = selectedTotals(pick("chicken", "chicken")).calories;
    expect(two).toBe(one * 2);
  });
});

describe("zoneCounts", () => {
  it("tallies portions per zone", () => {
    const c = zoneCounts(pick("chicken", "beans", "rice", "broccoli", "broccoli", "olive_oil"));
    expect(c.protein).toBe(2); // chicken + beans
    expect(c.carb).toBe(1);
    expect(c.veggie).toBe(2);
    expect(c.fat).toBe(1);
  });
});

describe("plateBalanceHint", () => {
  it("prompts to start when empty", () => {
    expect(plateBalanceHint([])).toMatch(/build your plate/i);
  });

  it("asks for protein, then veggies", () => {
    expect(plateBalanceHint(pick("rice"))).toMatch(/protein/i);
    expect(plateBalanceHint(pick("chicken"))).toMatch(/veg/i);
  });

  it("returns null for a balanced plate", () => {
    // 2 veggies (half), protein, carb → balanced
    expect(plateBalanceHint(pick("broccoli", "salad", "chicken", "rice"))).toBeNull();
  });

  it("never shames", () => {
    const words = ["bad", "fail", "wrong", "guilty", "shame", "cheat"];
    for (const sel of [[], pick("rice"), pick("chicken"), pick("chicken", "rice")]) {
      const hint = (plateBalanceHint(sel) ?? "").toLowerCase();
      for (const w of words) expect(hint).not.toContain(w);
    }
  });
});

describe("plateLogName", () => {
  it("lists foods, de-duped and capped", () => {
    expect(plateLogName(pick("chicken", "rice")).toLowerCase()).toBe("plate: chicken breast, rice");
    expect(plateLogName(pick("chicken", "chicken")).toLowerCase()).toBe("plate: chicken breast");
    const many = plateLogName(pick("chicken", "rice", "broccoli", "salad", "olive_oil"));
    expect(many).toMatch(/\+1$/);
  });

  it("falls back to 'Plate' with no foods", () => {
    expect(plateLogName([])).toBe("Plate");
  });
});

describe("zoneForFood", () => {
  it("classifies by dominant macro", () => {
    expect(zoneForFood("Chicken breast", 31, 0, 4)).toBe("protein");
    expect(zoneForFood("White rice", 3, 33, 0)).toBe("carb");
    expect(zoneForFood("Olive oil", 0, 0, 14)).toBe("fat");
  });
  it("catches non-starchy veggies by name", () => {
    expect(zoneForFood("Broccoli", 2, 6, 0)).toBe("veggie");
    expect(zoneForFood("Mixed salad", 1, 4, 0)).toBe("veggie");
  });
});
