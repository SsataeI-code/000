/**
 * Referral helpers (§8). A client shares a personal link; a friend who signs up
 * on it is tracked to the referrer, and the coach processes any reward (10% is a
 * default the coach controls or waives). Pure and tested — no I/O here.
 */

import type { ReferralStatus } from "@/lib/types/db";

/** Same safe alphabet as coach codes (no 0/O/1/I/L); referral codes are 7 chars. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 7;

/** Normalize any user-supplied referral code to the canonical stored form. */
export function normalizeReferralCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** A well-formed code is exactly CODE_LENGTH chars from the safe alphabet. */
export function isValidReferralCode(raw: string): boolean {
  const code = normalizeReferralCode(raw);
  if (code.length !== CODE_LENGTH) return false;
  for (const ch of code) {
    if (!CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}

/**
 * Pull a referral code from a signup URL's query (?ref=CODE). Returns the
 * normalized code, or null when absent/malformed — a bad code must never block
 * sign-up (it just means no referral is recorded).
 */
export function referralCodeFromParams(params: URLSearchParams): string | null {
  const raw = params.get("ref");
  if (!raw) return null;
  const code = normalizeReferralCode(raw);
  return isValidReferralCode(code) ? code : null;
}

/** Build the shareable invite link for a code against a site origin. */
export function referralLink(origin: string, code: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/signup?ref=${encodeURIComponent(code)}`;
}

/** A warm, ready-to-send invite message the client can share (§4 voice). */
export function inviteMessage(link: string): string {
  return `I've been using Total Form Fitness to build healthier habits — come join me. Sign up here: ${link}`;
}

export interface ReferralStats {
  joined: number;
  rewarded: number;
  total: number;
}

/** Tally a referrer's own referrals into headline counts (privacy-safe: no names). */
export function summarizeReferrals(statuses: ReferralStatus[]): ReferralStats {
  let rewarded = 0;
  for (const s of statuses) if (s === "rewarded") rewarded++;
  return { joined: statuses.length, rewarded, total: statuses.length };
}

/** Human label for a referral's status (coach-facing). */
export function referralStatusLabel(status: ReferralStatus): string {
  switch (status) {
    case "joined":
      return "Joined — reward pending";
    case "rewarded":
      return "Reward given";
    case "declined":
      return "Reward waived";
  }
}
