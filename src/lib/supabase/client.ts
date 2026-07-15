"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/db";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/** Browser Supabase client — for client components (auth UI, realtime later). */
export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
