import { describe, it, expect } from "vitest";
import { providerDef, providerConfigured, configuredProviders, WEARABLE_PROVIDERS } from "@/lib/wearables/providers";

describe("wearable providers", () => {
  it("has the four brief providers, each with an env prefix and honest pulls copy", () => {
    expect(WEARABLE_PROVIDERS.map((p) => p.id).sort()).toEqual(["fitbit", "garmin", "oura", "whoop"]);
    for (const p of WEARABLE_PROVIDERS) {
      expect(p.envPrefix).toBeTruthy();
      expect(p.pulls).toBeTruthy();
    }
  });

  it("looks up a provider by id", () => {
    expect(providerDef("oura")?.label).toBe("Oura");
    expect(providerDef("nope")).toBeUndefined();
  });

  it("is configured only when an OAuth2 provider has both keys", () => {
    const oura = providerDef("oura")!;
    expect(providerConfigured(oura, {})).toBe(false);
    expect(providerConfigured(oura, { OURA_CLIENT_ID: "x" })).toBe(false);
    expect(providerConfigured(oura, { OURA_CLIENT_ID: "x", OURA_CLIENT_SECRET: "y" })).toBe(true);
  });

  it("never reports the OAuth1 provider (Garmin) as configured, even with keys", () => {
    const garmin = providerDef("garmin")!;
    expect(providerConfigured(garmin, { GARMIN_CLIENT_ID: "x", GARMIN_CLIENT_SECRET: "y" })).toBe(false);
  });

  it("lists exactly the configured providers", () => {
    expect(configuredProviders({})).toEqual([]);
    expect(configuredProviders({ FITBIT_CLIENT_ID: "a", FITBIT_CLIENT_SECRET: "b" })).toEqual(["fitbit"]);
  });
});
