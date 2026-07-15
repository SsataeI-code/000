import { describe, expect, it } from "vitest";
import {
  canAccessArea,
  hasCoachPowers,
  homePathForRole,
  isAppRole,
  isOwner,
} from "@/lib/auth/roles";

describe("role model (multi-coach-ready)", () => {
  it("recognizes only the three valid roles", () => {
    expect(isAppRole("owner")).toBe(true);
    expect(isAppRole("coach")).toBe(true);
    expect(isAppRole("client")).toBe(true);
    expect(isAppRole("admin")).toBe(false);
    expect(isAppRole(undefined)).toBe(false);
    expect(isAppRole(42)).toBe(false);
  });

  it("gives coach powers to coaches and the owner, never clients", () => {
    expect(hasCoachPowers("coach")).toBe(true);
    expect(hasCoachPowers("owner")).toBe(true);
    expect(hasCoachPowers("client")).toBe(false);
  });

  it("reserves owner-only oversight to the owner", () => {
    expect(isOwner("owner")).toBe(true);
    expect(isOwner("coach")).toBe(false);
    expect(isOwner("client")).toBe(false);
  });

  it("routes each role to the right home surface", () => {
    expect(homePathForRole("owner")).toBe("/coach");
    expect(homePathForRole("coach")).toBe("/coach");
    expect(homePathForRole("client")).toBe("/client");
  });

  it("keeps clients out of /coach and coaches out of the client app", () => {
    expect(canAccessArea("client", "coach")).toBe(false);
    expect(canAccessArea("coach", "coach")).toBe(true);
    expect(canAccessArea("owner", "coach")).toBe(true);

    expect(canAccessArea("client", "client")).toBe(true);
    expect(canAccessArea("coach", "client")).toBe(false);
    expect(canAccessArea("owner", "client")).toBe(false);
  });
});
