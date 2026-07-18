import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/db";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Refresh the Supabase session on every request and return both the (possibly
 * updated) response and the current user. Keeping cookies fresh here is what
 * makes auth reliable across Server Components (CLAUDE.md §2 reliability).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() reaches out to Supabase Auth; if that call throws (bad env, network
  // blip) treat the request as signed-out rather than letting it bubble up.
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (err) {
    console.error("[supabase] getUser failed in middleware:", err);
  }

  return { response, supabase, user };
}
