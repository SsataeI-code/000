import { NextResponse, type NextRequest } from "next/server";
import { runEngagementSweep } from "@/lib/engagement/sweep";
import { sanitizeHeaderSafe } from "@/lib/supabase/env";

// Server-only, never cached. Runs the daily engagement sweep (§9/§10).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily engagement cron. Vercel Cron hits this once a day; when CRON_SECRET is
 * set, Vercel sends it as a Bearer token and we require a match, so the endpoint
 * can't be triggered by strangers. If the secret isn't configured yet, we allow
 * it (the sweep is idempotent) but recommend setting one.
 */
async function handle(req: NextRequest) {
  const secret = sanitizeHeaderSafe(process.env.CRON_SECRET);
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const report = await runEngagementSweep();
    return NextResponse.json({ ok: true, ...report, configuredSecret: Boolean(secret) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "sweep failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
