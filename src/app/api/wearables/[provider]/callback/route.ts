import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { providerDef, providerConfigured } from "@/lib/wearables/providers";

export const dynamic = "force-dynamic";

const back = (req: Request, q: string) => NextResponse.redirect(new URL(`/client/connect?${q}`, req.url));

/**
 * OAuth callback (§7). Verifies the CSRF state, exchanges the code for tokens,
 * and stores the connection (tokens are RLS-private to the client). Defensive at
 * every step — any failure bounces back with an honest error, never a crash, and
 * a bad response never corrupts state (§6/§15).
 */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const def = providerDef(provider);
  if (!def || !providerConfigured(def, process.env) || !def.tokenUrl) return back(req, "error=not_available");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = await cookies();
  const saved = jar.get(`wl_state_${def.id}`)?.value;
  jar.delete(`wl_state_${def.id}`);
  if (!code || !state || !saved || state !== saved) return back(req, "error=state");

  const clientId = process.env[`${def.envPrefix}_CLIENT_ID`] ?? "";
  const clientSecret = process.env[`${def.envPrefix}_CLIENT_SECRET`] ?? "";
  const redirectUri = `${url.origin}/api/wearables/${def.id}/callback`;

  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(def.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` },
      body,
    });
    if (!res.ok) return back(req, "error=token");

    const tok = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      scope?: string;
      expires_in?: number;
    };
    if (!tok.access_token) return back(req, "error=token");

    const supabase = await createClient();
    const { error } = await supabase.from("wearable_connections").upsert(
      {
        client_id: user.id,
        provider: def.id,
        status: "connected",
        access_token: tok.access_token,
        refresh_token: tok.refresh_token ?? null,
        scope: tok.scope ?? def.scope ?? null,
        expires_at: tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000).toISOString() : null,
      },
      { onConflict: "client_id,provider" },
    );
    if (error) return back(req, "error=save");

    return back(req, `connected=${def.id}`);
  } catch {
    return back(req, "error=token");
  }
}
