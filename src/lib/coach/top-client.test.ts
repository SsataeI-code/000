import { describe, it, expect } from "vitest";
import { topClientIds, type RankEntry } from "@/lib/coach/top-client";

describe("topClientIds", () => {
  it("crowns the highest level per coach", () => {
    const entries: RankEntry[] = [
      { clientId: "a", coachId: "c1", level: 3, xp: 700 },
      { clientId: "b", coachId: "c1", level: 5, xp: 2600 }, // top for c1
      { clientId: "c", coachId: "c2", level: 2, xp: 300 }, // top for c2 (only one)
    ];
    const top = topClientIds(entries);
    expect(top.has("b")).toBe(true);
    expect(top.has("c")).toBe(true);
    expect(top.has("a")).toBe(false);
  });

  it("breaks ties on XP", () => {
    const top = topClientIds([
      { clientId: "a", coachId: "c1", level: 4, xp: 1300 },
      { clientId: "b", coachId: "c1", level: 4, xp: 1500 },
    ]);
    expect(top.has("b")).toBe(true);
    expect(top.has("a")).toBe(false);
  });

  it("never crowns a client with no progress", () => {
    expect(topClientIds([{ clientId: "a", coachId: "c1", level: 1, xp: 0 }]).size).toBe(0);
  });

  it("gives each solo (coachless) client their own group", () => {
    const top = topClientIds([
      { clientId: "a", coachId: null, level: 2, xp: 300 },
      { clientId: "b", coachId: null, level: 5, xp: 2600 },
    ]);
    // Both are their own #1 when uncoached.
    expect(top.has("a")).toBe(true);
    expect(top.has("b")).toBe(true);
  });
});
