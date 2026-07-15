import { describe, expect, it } from "vitest";
import {
  coachCodeFromParams,
  generateCoachCode,
  isValidCoachCode,
  normalizeCoachCode,
} from "@/lib/auth/coach-code";

describe("coach codes", () => {
  it("normalizes case, whitespace, and punctuation", () => {
    expect(normalizeCoachCode("  ab-c 23 ")).toBe("ABC23");
    expect(normalizeCoachCode("abcd23")).toBe("ABCD23");
  });

  it("accepts well-formed 6-char codes from the safe alphabet", () => {
    expect(isValidCoachCode("ABC234")).toBe(true);
    expect(isValidCoachCode("abc234")).toBe(true);
  });

  it("rejects wrong length or ambiguous/invalid characters", () => {
    expect(isValidCoachCode("ABC23")).toBe(false); // too short
    expect(isValidCoachCode("ABC2345")).toBe(false); // too long
    expect(isValidCoachCode("ABCO23")).toBe(false); // O is excluded
    expect(isValidCoachCode("ABC012")).toBe(false); // 0/1 excluded
    expect(isValidCoachCode("")).toBe(false);
  });

  it("reads a code from ?coach= or ?code=, else null", () => {
    expect(coachCodeFromParams(new URLSearchParams("coach=abc234"))).toBe("ABC234");
    expect(coachCodeFromParams(new URLSearchParams("code=ABC234"))).toBe("ABC234");
    expect(coachCodeFromParams(new URLSearchParams(""))).toBeNull();
  });

  it("returns null for a malformed code so open sign-up is never blocked", () => {
    // A bad code must fall through to the owner, not error the signup page.
    expect(coachCodeFromParams(new URLSearchParams("coach=not-a-real-code"))).toBeNull();
  });

  it("generates valid codes deterministically from a seeded RNG", () => {
    let n = 0;
    const seq = [0, 0.5, 0.99, 0.2, 0.7, 0.1];
    const code = generateCoachCode(() => seq[n++ % seq.length]);
    expect(code).toHaveLength(6);
    expect(isValidCoachCode(code)).toBe(true);
  });
});
