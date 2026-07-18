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
  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    // Misconfigured env: behave as signed-out so callers redirect to /login
    // instead of throwing a 500 (§2 reliability).
    console.error("[supabase] client init failed:", err);
    return null;
  }

  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (err) {
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
