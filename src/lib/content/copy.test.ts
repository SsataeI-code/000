import { describe, expect, it } from "vitest";
import { defaultCopy, getCopy, copyKeys, copySection } from "@/lib/content/copy";

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

  it("falls back to the default when an override is empty (a blank never blanks the UI)", () => {
    expect(getCopy("brand.name", { "brand.name": "" })).toBe(defaultCopy["brand.name"]);
    expect(getCopy("brand.name", {})).toBe(defaultCopy["brand.name"]);
  });

  it("exposes every key and groups them by section for the CMS editor", () => {
    expect(copyKeys.length).toBe(Object.keys(defaultCopy).length);
    expect(copySection("auth.signup.title")).toBe("auth");
    expect(copySection("brand.name")).toBe("brand");
    // Every key resolves to a known section prefix.
    for (const k of copyKeys) expect(copySection(k)).toMatch(/^(brand|landing|auth|client|coach|common)$/);
  });
});
