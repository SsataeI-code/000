/**
 * Coach-code helpers. A client signs up either via a coach's code/link OR open
 * public sign-up (CLAUDE.md §8). Codes are short, human-shareable, and
 * case-insensitive so a link and a hand-typed code resolve identically.
 */

/** Characters that are unambiguous when read aloud or typed (no 0/O, 1/I/L). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

/** Normalize any user-supplied code to the canonical stored form. */
export function normalizeCoachCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** A well-formed code is exactly CODE_LENGTH chars from the safe alphabet. */
export function isValidCoachCode(raw: string): boolean {
  const code = normalizeCoachCode(raw);
  if (code.length !== CODE_LENGTH) return false;
  for (const ch of code) {
    if (!CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}

/**
 * Pull a coach code from a signup URL's query (?coach=ABC123 or ?code=ABC123).
 * Returns the normalized code, or null when absent/malformed — an invalid code
 * must never block open public sign-up (it just falls through to the owner).
 */
export function coachCodeFromParams(params: URLSearchParams): string | null {
  const raw = params.get("coach") ?? params.get("code");
  if (!raw) return null;
  const code = normalizeCoachCode(raw);
  return isValidCoachCode(code) ? code : null;
}

/** Generate a fresh coach code (used when provisioning a coach). */
export function generateCoachCode(random: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return out;
}
