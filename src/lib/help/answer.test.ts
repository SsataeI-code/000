import { describe, expect, it } from "vitest";
import { answerQuestion, type HelpContext } from "@/lib/help/answer";

const ctx: HelpContext = {
  firstName: "Alex",
  goal: "lose",
  remaining: { calories: 600, proteinG: 55, carbsG: 40, fatG: 20 },
  waterOz: 40,
  waterGoalOz: 90,
  habitsDue: [
    { name: "8k steps", done: true },
    { name: "10-min walk", done: false },
  ],
  nextHabit: { name: "Lights out by 11pm", why: "Sleep drives recovery." },
};

describe("no-AI answer helper", () => {
  it("answers protein from real remaining data", () => {
    expect(answerQuestion("how much protein do I have left?", ctx)).toContain("55g");
  });

  it("answers calories, water, and habits from data", () => {
    expect(answerQuestion("calories left?", ctx)).toContain("600");
    expect(answerQuestion("how's my water", ctx)).toContain("40 of 90");
    expect(answerQuestion("what habits do I still have", ctx)).toContain("10-min walk");
  });

  it("never invents numbers when targets are missing", () => {
    const noTargets: HelpContext = { ...ctx, remaining: null };
    const a = answerQuestion("how much protein left", noTargets);
    expect(a).toMatch(/don't have targets/i);
    expect(a).not.toMatch(/\d+g/); // no fabricated grams
  });

  it("celebrates when a target is already met", () => {
    const met: HelpContext = { ...ctx, remaining: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 } };
    expect(answerQuestion("protein left?", met)).toMatch(/hit your protein/i);
  });

  it("recommends the next habit from the adaptive engine", () => {
    expect(answerQuestion("what habit should I add next?", ctx)).toContain("Lights out by 11pm");
    const notReady = answerQuestion("recommend a habit", { ...ctx, nextHabit: null });
    expect(notReady).toMatch(/sticking first/i);
  });

  it("recommends food with concrete meal ideas and their remaining numbers", () => {
    const a = answerQuestion("what should I eat right now?", ctx);
    expect(a).toContain("600"); // remaining calories
    expect(a).toMatch(/greek yogurt|chicken/i);
  });

  it("routes plan changes to the coach, never changes them", () => {
    expect(answerQuestion("can you change my calorie goal", ctx)).toMatch(/coach/i);
  });

  it("answers the barcode FAQ", () => {
    expect(answerQuestion("how do I scan a barcode", ctx).toLowerCase()).toContain("scan");
  });

  it("falls back to the coach for anything it can't handle", () => {
    expect(answerQuestion("what's the meaning of life", ctx)).toMatch(/message your coach/i);
  });

  it("greets by name", () => {
    expect(answerQuestion("hi", ctx)).toContain("Alex");
  });
});
