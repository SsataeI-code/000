import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { homePathForRole } from "@/lib/auth/roles";
import { coachCodeFromParams } from "@/lib/auth/coach-code";
import { hasSupabaseConfig } from "@/lib/supabase/env";

/**
 * Email-confirmation / OAuth callback. Exchanges the code for a session, then
 * links the client to their coach (or the owner) if they haven't been linked
 * yet — the coach code rode along in the query string from sign-up.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  if (!hasSupabaseConfig()) {
    return NextResponse.redirect(`${origin}/`);
  }

  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Idempotent link: resolve_signup does nothing if already linked.
  const coachCode = coachCodeFromParams(searchParams);
  await supabase.rpc("resolve_signup", {
    p_coach_code: coachCode,
    p_consent: true,
    p_referral_code: null,
  });

  const user = await getSessionUser();
  const dest = user ? homePathForRole(user.role) : "/client";
  return NextResponse.redirect(`${origin}${dest}`);
}
