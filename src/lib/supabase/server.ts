import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/db";
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Server Supabase client bound to the request's cookies. Use in Server
 * Components, Server Actions, and Route Handlers. Runs as the authenticated
 * user, so RLS is fully in force.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Session refresh is handled in middleware, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Service-role client — bypasses RLS. SERVER ONLY. Never import into a client
 * component. Reserved for trusted operations that must transcend a single user's
 * row visibility (e.g. owner provisioning). Prefer RLS + RPC where possible.
 */
export function createAdminClient() {
  return createServerClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // No session cookies for the admin client.
      },
    },
  });
}
