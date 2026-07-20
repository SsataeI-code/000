import { describe, expect, it } from "vitest";
import {
  fetchProductByBarcode,
  isValidBarcode,
  macrosForGrams,
  parseOffResponse,
  parseOffSearchResponse,
  searchProducts,
  toNumber,
} from "@/lib/food/off";

describe("OFF defensive parsing (§6)", () => {
  it("treats status:0 (HTTP 200 not-found trap) as not found", () => {
    expect(parseOffResponse("000", { status: 0 })).toEqual({
      found: false,
      reason: "not_found",
    });
    // Some payloads stringify status.
    expect(parseOffResponse("000", { status: "0" }).found).toBe(false);
  });

  it("never throws on garbage input", () => {
    for (const junk of [null, undefined, 42, "nope", [], {}]) {
      expect(() => parseOffResponse("000", junk)).not.toThrow();
      expect(parseOffResponse("000", junk).found).toBe(false);
    }
  });

  it("parses a well-formed product and flags no missing macros", () => {
    const res = parseOffResponse("123", {
      status: 1,
      product: {
        product_name: "Greek Yogurt",
        brands: "Fage",
        nutriments: {
          "energy-kcal_100g": 97,
          proteins_100g: 9,
          carbohydrates_100g: 4,
          fat_100g: 5,
          sodium_100g: 0.04,
        },
      },
    });
    expect(res.found).toBe(true);
    if (!res.found) return;
    expect(res.product.name).toBe("Greek Yogurt");
    expect(res.product.brand).toBe("Fage");
    expect(res.product.per100g).toEqual({ calories: 97, proteinG: 9, carbsG: 4, fatG: 5 });
    expect(res.product.missing).toEqual([]);
    expect(res.product.nutrimentsPer100g.sodium).toBe(0.04);
  });

  it("reports missing macros instead of guessing (trust-but-verify)", () => {
    const res = parseOffResponse("123", {
      status: 1,
      product: { product_name: "Mystery Bar", nutriments: { proteins_100g: 20 } },
    });
    expect(res.found).toBe(true);
    if (!res.found) return;
    expect(res.product.per100g.proteinG).toBe(20);
    expect(res.product.missing.sort()).toEqual(["calories", "carbsG", "fatG"]);
  });

  it("coerces stringified numbers and derives kcal from kJ when needed", () => {
    const res = parseOffResponse("123", {
      status: 1,
      product: { product_name: "X", nutriments: { "energy-kj_100g": "418", proteins_100g: "3" } },
    });
    expect(res.found).toBe(true);
    if (!res.found) return;
    expect(res.product.per100g.calories).toBe(100); // 418 / 4.184 ≈ 100
    expect(res.product.per100g.proteinG).toBe(3);
  });

  it("toNumber is total and safe", () => {
    expect(toNumber(5)).toBe(5);
    expect(toNumber("5.5")).toBe(5.5);
    expect(toNumber("")).toBeNull();
    expect(toNumber("abc")).toBeNull();
    expect(toNumber(NaN)).toBeNull();
    expect(toNumber(null)).toBeNull();
    expect(toNumber({})).toBeNull();
  });

  it("validates barcodes as 6–14 digit strings", () => {
    expect(isValidBarcode("0123456789012")).toBe(true);
    expect(isValidBarcode("12345")).toBe(false);
    expect(isValidBarcode("abc123")).toBe(false);
    expect(isValidBarcode("")).toBe(false);
  });

  it("scales per-100g macros to a serving size", () => {
    const m = macrosForGrams({ calories: 200, proteinG: 10, carbsG: 20, fatG: 8 }, 50);
    expect(m).toEqual({ calories: 100, proteinG: 5, carbsG: 10, fatG: 4 });
  });

  it("fetch wrapper returns not_found on a 200+status:0 without throwing", async () => {
    const fakeFetch = (async () =>
      new Response(JSON.stringify({ status: 0 }), { status: 200 })) as unknown as typeof fetch;
    const res = await fetchProductByBarcode("0000000000000", fakeFetch);
    expect(res).toEqual({ found: false, reason: "not_found" });
  });

  it("fetch wrapper returns network_error when fetch rejects", async () => {
    const boom = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const res = await fetchProductByBarcode("0000000000000", boom);
    expect(res).toEqual({ found: false, reason: "network_error" });
  });
});

describe("OFF text search (§6)", () => {
  const payload = {
    products: [
      {
        code: "1",
        product_name: "White Bread",
        brands: "Wonder",
        nutriments: { "energy-kcal_100g": 265, proteins_100g: 9, carbohydrates_100g: 49, fat_100g: 3 },
      },
      // Missing calories → filtered out (can't estimate from it).
      { code: "2", product_name: "Mystery Loaf", nutriments: { proteins_100g: 8 } },
      // Missing name → filtered out.
      { code: "3", nutriments: { "energy-kcal_100g": 100 } },
    ],
  };

  it("returns only results with a name and calories", () => {
    const results = parseOffSearchResponse(payload);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("White Bread");
    expect(results[0].per100g.calories).toBe(265);
  });

  it("returns [] for garbage or empty payloads (never throws)", () => {
    for (const junk of [null, undefined, {}, { products: "nope" }, 5]) {
      expect(parseOffSearchResponse(junk)).toEqual([]);
    }
  });

  it("searchProducts skips the network for queries under 2 chars", async () => {
    let called = false;
    const spy = (async () => {
      called = true;
      return new Response("{}");
    }) as unknown as typeof fetch;
    expect(await searchProducts("a", 15, spy)).toEqual([]);
    expect(called).toBe(false);
  });

  it("searchProducts returns [] (not a throw) when the request fails", async () => {
    const boom = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await searchProducts("white bread", 15, boom)).toEqual([]);
  });

  it("searchProducts parses a live-shaped payload", async () => {
    const fake = (async () =>
      new Response(JSON.stringify(payload), { status: 200 })) as unknown as typeof fetch;
    const results = await searchProducts("white bread", 15, fake);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("White Bread");
  });
});
