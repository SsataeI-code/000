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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
