import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/db";
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/supabase/env";

/**
 * Service-role Supabase client — SERVER ONLY. Bypasses RLS, so it must never be
 * imported into a client component or exposed to the browser. Used by the daily
 * engagement cron, which needs to read every client and write nudges /
 * notifications on their behalf.
 */
export function createAdminClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
