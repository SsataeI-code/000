import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { canAccessArea, homePathForRole, isAppRole } from "@/lib/auth/roles";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import type { AppRole } from "@/lib/types/db";

/** Routes reachable while signed out. Everything else requires a session. */
const PUBLIC_PATHS = ["/", "/login", "/signup", "/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  // Before Supabase is wired up, don't gate anything — let the setup screen show.
  if (!hasSupabaseConfig()) {
    return NextResponse.next({ request });
  }

  const { response, supabase, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Signed out: allow public routes, bounce everything else to /login.
  if (!user) {
    if (isPublicPath(pathname)) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed in: resolve role once for gating.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role: AppRole = profile && isAppRole(profile.role) ? profile.role : "client";

  // Keep signed-in users out of the auth screens.
  if (pathname === "/login" || pathname === "/signup") {
    const url = request.nextUrl.clone();
    url.pathname = homePathForRole(role);
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Area gating — a client can't reach /coach, a coach can't reach /client.
  if (pathname === "/coach" || pathname.startsWith("/coach/")) {
    if (!canAccessArea(role, "coach")) {
      return redirectHome(request, role);
    }
  }
  if (pathname === "/client" || pathname.startsWith("/client/")) {
    if (!canAccessArea(role, "client")) {
      return redirectHome(request, role);
    }
  }

  return response;
}

function redirectHome(request: NextRequest, role: AppRole) {
  const url = request.nextUrl.clone();
  url.pathname = homePathForRole(role);
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)"],
};
