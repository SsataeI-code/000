import { describe, expect, it } from "vitest";
import { buildClientContext, buildCoachContext } from "@/lib/ai/context";
import { clientAssistantSystem, coachDraftSystem } from "@/lib/ai/prompts";

describe("AI context builder", () => {
  it("grounds in real numbers and computes what's remaining", () => {
    const ctx = buildClientContext({
      firstName: "Alex",
      goal: "lose",
      dietPreference: "low_carb",
      targets: { calories: 2000, proteinG: 150, carbsG: 150, fatG: 70 },
      todayTotals: { calories: 1400, proteinG: 90, carbsG: 100, fatG: 50 },
      waterOz: 40,
      waterGoalOz: 90,
      habitsDueToday: [
        { name: "8k steps", done: true },
        { name: "10-min walk", done: false },
      ],
    });
    expect(ctx).toContain("Alex");
    expect(ctx).toContain("fat loss");
    expect(ctx).toContain("2000 cal, 150g protein");
    expect(ctx).toContain("Remaining today: 600 cal, 60g protein"); // 2000-1400, 150-90
    expect(ctx).toContain("40 of 90 oz");
    expect(ctx).toContain("still to do: 10-min walk");
  });

  it("handles a client with no targets set", () => {
    const ctx = buildClientContext({
      firstName: null,
      goal: "habits_only",
      dietPreference: null,
      targets: null,
      todayTotals: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      waterOz: 0,
      waterGoalOz: 64,
      habitsDueToday: [],
    });
    expect(ctx).toContain("No nutrition targets set yet");
    expect(ctx).toContain("healthy habits");
  });

  it("coach context summarizes the client's status", () => {
    const ctx = buildCoachContext({
      clientFirstName: "Sam",
      goal: "gain",
      daysSinceActivity: 4,
      daysSinceFood: 4,
      habitLevelName: "Steady",
      currentStreak: 6,
      flags: ["Quiet 4d"],
    });
    expect(ctx).toContain("Sam");
    expect(ctx).toContain("muscle gain");
    expect(ctx).toContain("4 day(s) ago");
    expect(ctx).toContain("Quiet 4d");
  });
});

describe("AI prompts — guardrails are always present", () => {
  const block = "Client: Alex\nGoal: fat loss";

  it("client system prompt carries every hard rule", () => {
    const s = clientAssistantSystem(block).toLowerCase();
    expect(s).toContain("never diagnose");
    expect(s).toContain("never invent nutrition numbers");
    expect(s).toContain("coach's plan");
    expect(s).toContain("disordered eating");
    expect(s).toContain("never shaming");
    expect(clientAssistantSystem(block)).toContain(block); // grounded in the data
  });

  it("coach draft prompt is coach-voiced and keeps the coach as the last tap", () => {
    const s = coachDraftSystem(block, "Adam");
    expect(s).toContain("Adam");
    expect(s.toLowerCase()).toContain("coach is always the one who taps send");
    expect(s.toLowerCase()).toContain("never invent nutrition numbers");
    expect(s).toContain(block);
  });
});
