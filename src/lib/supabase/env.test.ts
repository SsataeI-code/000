import { describe, expect, it } from "vitest";
import { normalizeSupabaseUrl, sanitizeHeaderSafe } from "@/lib/supabase/env";

describe("sanitizeHeaderSafe", () => {
  it("removes characters that can't go in an HTTP header (e.g. → U+2192)", () => {
    expect(sanitizeHeaderSafe("eyJhbGc→iOiJ")).toBe("eyJhbGciOiJ");
  });

  it("leaves a clean JWT-shaped key untouched", () => {
    const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc123._sig-Value";
    expect(sanitizeHeaderSafe(key)).toBe(key);
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeHeaderSafe("  key  ")).toBe("key");
  });

  it("returns empty string for empty/undefined", () => {
    expect(sanitizeHeaderSafe(undefined)).toBe("");
    expect(sanitizeHeaderSafe("")).toBe("");
  });
});

describe("normalizeSupabaseUrl", () => {
  it("passes a well-formed URL through unchanged", () => {
    expect(normalizeSupabaseUrl("https://abc.supabase.co")).toBe("https://abc.supabase.co");
  });

  it("adds https:// when the protocol is missing (the crash-causing case)", () => {
    expect(normalizeSupabaseUrl("abc.supabase.co")).toBe("https://abc.supabase.co");
  });

  it("trims surrounding whitespace and newlines", () => {
    expect(normalizeSupabaseUrl("  https://abc.supabase.co \n")).toBe("https://abc.supabase.co");
  });

  it("drops a trailing slash", () => {
    expect(normalizeSupabaseUrl("https://abc.supabase.co/")).toBe("https://abc.supabase.co");
  });

  it("handles a pasted value that is both missing protocol and has a trailing slash", () => {
    expect(normalizeSupabaseUrl("abc.supabase.co/")).toBe("https://abc.supabase.co");
  });

  it("returns empty string for empty/undefined input", () => {
    expect(normalizeSupabaseUrl(undefined)).toBe("");
    expect(normalizeSupabaseUrl("   ")).toBe("");
  });
});
