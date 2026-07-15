import type { AppRole } from "@/lib/types/db";

/**
 * Role helpers — the multi-coach role model lives here so no component ever
 * hard-codes a single-coach assumption (CLAUDE.md §16).
 */

export const APP_ROLES: readonly AppRole[] = ["owner", "coach", "client"] as const;

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

/** The owner is a super-admin coach: full coach powers + oversight of everyone. */
export function hasCoachPowers(role: AppRole): boolean {
  return role === "coach" || role === "owner";
}

/** Only the owner oversees the whole roster across all coaches. */
export function isOwner(role: AppRole): boolean {
  return role === "owner";
}

/** Home surface for a role — clients get the low-friction app, coaches the command center. */
export function homePathForRole(role: AppRole): "/coach" | "/client" {
  return hasCoachPowers(role) ? "/coach" : "/client";
}

/**
 * Can a role enter a given app area? Enforced in middleware and on the server —
 * a client can never reach /coach, and vice-versa.
 */
export function canAccessArea(role: AppRole, area: "coach" | "client"): boolean {
  if (area === "coach") return hasCoachPowers(role);
  // The client "Today" app is for clients. Coaches manage from /coach, not here.
  return role === "client";
}
