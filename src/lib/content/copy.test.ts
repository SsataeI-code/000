import { describe, expect, it } from "vitest";
import { defaultCopy, getCopy } from "@/lib/content/copy";

describe("CMS-ready copy", () => {
  it("returns the house-style default when no override exists", () => {
    expect(getCopy("brand.name")).toBe(defaultCopy["brand.name"]);
  });

  it("lets a CMS override win (the Phase 6 seam)", () => {
    expect(getCopy("brand.name", { "brand.name": "Coach Jo's Studio" })).toBe(
      "Coach Jo's Studio",
    );
  });

  it("ships every key with a non-empty default (nothing hard-coded, nothing blank)", () => {
    for (const [key, value] of Object.entries(defaultCopy)) {
      expect(value, `copy for ${key}`).toBeTruthy();
    }
  });

  it("keeps consent copy present — consent is never skipped (§16)", () => {
    expect(getCopy("auth.signup.consentLabel").length).toBeGreaterThan(0);
    expect(getCopy("auth.error.consentRequired").length).toBeGreaterThan(0);
  });
});
