import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/lib/types/db";
import { isAppRole } from "@/lib/auth/roles";

export interface SessionUser {
  id: string;
  email: string | null;
  role: AppRole;
  profile: Profile | null;
}

/**
 * Load the current authenticated user together with their role. Returns null
 * when signed out. Defends against a missing/half-written profile row by
 * defaulting to the least-privileged role ("client") rather than throwing —
 * a transient profile gap must never lock a paying client out (§2 reliability).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  // NB: do NOT wrap createClient() in try/catch — it calls next/headers
  // `cookies()`, which throws Next's internal "render dynamically" control-flow
  // signal that MUST propagate. Only the Supabase network call below is guarded.
  const supabase = await createClient();

  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (err) {
    // A Supabase/network failure means "we can't confirm a session" → treat as
    // signed-out so callers redirect to /login rather than 500 (§2 reliability).
    console.error("[supabase] getUser failed:", err);
    return null;
  }

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const role: AppRole = profile && isAppRole(profile.role) ? profile.role : "client";

  return {
    id: user.id,
    email: user.email ?? null,
    role,
    profile: (profile as Profile | null) ?? null,
  };
}
