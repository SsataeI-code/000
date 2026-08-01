import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import { providerDef, providerConfigured } from "@/lib/wearables/providers";

export const dynamic = "force-dynamic";

/**
 * Start the OAuth "Connect your tracker" flow (§7). Redirects the client to the
 * provider's consent screen. Only works when the provider is a configured OAuth2
 * provider; otherwise bounces back with an honest error. A CSRF `state` is stored
 * in an httpOnly cookie and checked on callback.
 */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const def = providerDef(provider);
  if (!def || !providerConfigured(def, process.env) || !def.authUrl) {
    return NextResponse.redirect(new URL("/client/connect?error=not_available", req.url));
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/wearables/${def.id}/callback`;
  const state = crypto.randomUUID();

  const jar = await cookies();
  jar.set(`wl_state_${def.id}`, state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });

  const authUrl = new URL(def.authUrl);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", process.env[`${def.envPrefix}_CLIENT_ID`] ?? "");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  if (def.scope) authUrl.searchParams.set("scope", def.scope);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
