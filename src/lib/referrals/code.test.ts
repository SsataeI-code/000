import { describe, it, expect } from "vitest";
import {
  normalizeReferralCode,
  isValidReferralCode,
  referralCodeFromParams,
  referralLink,
  inviteMessage,
  summarizeReferrals,
  referralStatusLabel,
} from "@/lib/referrals/code";

describe("referral code", () => {
  it("normalizes to uppercase and strips punctuation/spaces", () => {
    expect(normalizeReferralCode(" ab2-cd34 ")).toBe("AB2CD34");
  });

  it("validates 7-char safe-alphabet codes and rejects ambiguous/short ones", () => {
    expect(isValidReferralCode("ABCD23K")).toBe(true);
    expect(isValidReferralCode("abcd23k")).toBe(true); // normalized first
    expect(isValidReferralCode("ABC12")).toBe(false); // too short
    expect(isValidReferralCode("ABCDE1O")).toBe(false); // O is not in the alphabet
    expect(isValidReferralCode("ABCDE01")).toBe(false); // 0 is not in the alphabet
  });

  it("reads a valid ?ref= code and ignores a malformed one", () => {
    expect(referralCodeFromParams(new URLSearchParams("ref=abcd23k"))).toBe("ABCD23K");
    expect(referralCodeFromParams(new URLSearchParams("ref=nope"))).toBeNull();
    expect(referralCodeFromParams(new URLSearchParams(""))).toBeNull();
  });

  it("builds a clean invite link even when the origin has a trailing slash", () => {
    expect(referralLink("https://app.test/", "ABCD23K")).toBe("https://app.test/signup?ref=ABCD23K");
    expect(inviteMessage("https://app.test/signup?ref=ABCD23K")).toContain("https://app.test/signup?ref=ABCD23K");
  });

  it("summarizes a referrer's counts without leaking names", () => {
    expect(summarizeReferrals(["joined", "rewarded", "joined"])).toEqual({ joined: 3, rewarded: 1, total: 3 });
    expect(summarizeReferrals([])).toEqual({ joined: 0, rewarded: 0, total: 0 });
  });

  it("labels each status for the coach", () => {
    expect(referralStatusLabel("joined")).toMatch(/pending/i);
    expect(referralStatusLabel("rewarded")).toMatch(/given/i);
    expect(referralStatusLabel("declined")).toMatch(/waived/i);
  });
});
