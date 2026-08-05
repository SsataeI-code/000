import { describe, it, expect } from "vitest";
import { fitsDiet, isDietPattern, parseAvoid, isAvoided, allowedByDiet, classifyFood } from "@/lib/food/diet";

describe("classifyFood", () => {
  it("tags common foods", () => {
    expect(classifyFood("Chicken breast, cooked").meat).toBe(true);
    expect(classifyFood("Salmon, cooked").fish).toBe(true);
    expect(classifyFood("Greek yogurt, plain nonfat").dairy).toBe(true);
    expect(classifyFood("Egg, whole").egg).toBe(true);
    expect(classifyFood("Brown rice, cooked").animal).toBe(false);
  });
});

describe("fitsDiet", () => {
  it("vegan excludes all animal foods, keeps plants", () => {
    expect(fitsDiet("Chicken breast", "vegan")).toBe(false);
    expect(fitsDiet("Cheddar cheese", "vegan")).toBe(false);
    expect(fitsDiet("Egg, whole", "vegan")).toBe(false);
    expect(fitsDiet("Lentils, cooked", "vegan")).toBe(true);
    expect(fitsDiet("Tofu, firm", "vegan")).toBe(true);
  });

  it("vegetarian keeps dairy/egg but not meat/fish", () => {
    expect(fitsDiet("Greek yogurt", "vegetarian")).toBe(true);
    expect(fitsDiet("Egg, whole", "vegetarian")).toBe(true);
    expect(fitsDiet("Beef steak", "vegetarian")).toBe(false);
    expect(fitsDiet("Salmon, cooked", "vegetarian")).toBe(false);
  });

  it("pescatarian allows fish but not other meat", () => {
    expect(fitsDiet("Salmon, cooked", "pescatarian")).toBe(true);
    expect(fitsDiet("Chicken breast", "pescatarian")).toBe(false);
  });

  it("carnivore keeps only animal foods", () => {
    expect(fitsDiet("Beef steak", "carnivore")).toBe(true);
    expect(fitsDiet("Egg, whole", "carnivore")).toBe(true);
    expect(fitsDiet("Brown rice, cooked", "carnivore")).toBe(false);
  });

  it("mediterranean drops red & processed meat, keeps fish/poultry/plants", () => {
    expect(fitsDiet("Beef steak", "mediterranean")).toBe(false);
    expect(fitsDiet("Pepperoni", "mediterranean")).toBe(false);
    expect(fitsDiet("Salmon, cooked", "mediterranean")).toBe(true);
    expect(fitsDiet("Chicken breast", "mediterranean")).toBe(true);
    expect(fitsDiet("Chickpeas, cooked", "mediterranean")).toBe(true);
  });

  it("anything allows everything", () => {
    expect(fitsDiet("Beef liver, cooked", "anything")).toBe(true);
  });
});

describe("avoid list", () => {
  it("parses and matches keywords", () => {
    const kw = parseAvoid("Peanuts, shellfish\ncilantro");
    expect(kw).toEqual(["peanuts", "shellfish", "cilantro"]);
    expect(isAvoided("Peanut butter", kw)).toBe(true);
    expect(isAvoided("Almond butter", kw)).toBe(false);
  });

  it("allowedByDiet combines pattern + avoid", () => {
    const filter = { pattern: "vegan" as const, avoid: parseAvoid("soy") };
    expect(allowedByDiet("Lentils, cooked", filter)).toBe(true);
    expect(allowedByDiet("Tofu (soy)", filter)).toBe(false); // avoided
    expect(allowedByDiet("Chicken breast", filter)).toBe(false); // not vegan
  });
});

describe("isDietPattern", () => {
  it("validates", () => {
    expect(isDietPattern("vegan")).toBe(true);
    expect(isDietPattern("keto")).toBe(false);
  });
});
