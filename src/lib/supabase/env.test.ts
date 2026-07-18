import { describe, expect, it } from "vitest";
import { normalizeSupabaseUrl } from "@/lib/supabase/env";

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
