import { describe, it, expect } from "vitest";
import { parseMealItems, looksLikeMealLog } from "@/lib/food/parse-meal";

describe("looksLikeMealLog", () => {
  it("detects log intent and 'I ate/had' openers", () => {
    expect(looksLikeMealLog("log 2 eggs and toast")).toBe(true);
    expect(looksLikeMealLog("I had chicken and rice")).toBe(true);
    expect(looksLikeMealLog("ate a banana")).toBe(true);
  });
  it("ignores questions", () => {
    expect(looksLikeMealLog("what should I eat?")).toBe(false);
    expect(looksLikeMealLog("how much protein do I have left?")).toBe(false);
    expect(looksLikeMealLog("")).toBe(false);
  });
});

describe("parseMealItems", () => {
  it("splits on commas and 'and', with quantities", () => {
    expect(parseMealItems("I had 2 eggs, toast and a banana")).toEqual([
      { qty: 2, name: "eggs" },
      { qty: 1, name: "toast" },
      { qty: 1, name: "banana" },
    ]);
  });

  it("handles number words and 'with'/'plus'", () => {
    expect(parseMealItems("log three chicken thighs with rice plus broccoli")).toEqual([
      { qty: 3, name: "chicken thighs" },
      { qty: 1, name: "rice" },
      { qty: 1, name: "broccoli" },
    ]);
  });

  it("strips filler words and the lead-in", () => {
    expect(parseMealItems("ate a bowl of oats")).toEqual([{ qty: 1, name: "bowl oats" }]);
  });

  it("clamps silly quantities and drops empties", () => {
    expect(parseMealItems("log 999 rice,,, and")).toEqual([{ qty: 1, name: "rice" }]);
  });

  it("returns [] for empty input", () => {
    expect(parseMealItems("")).toEqual([]);
    expect(parseMealItems("   ")).toEqual([]);
  });
});
