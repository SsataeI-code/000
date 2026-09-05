import { NextResponse, type NextRequest } from "next/server";
import { runReminderSweep } from "@/lib/reminders/sweep";
import { sanitizeHeaderSafe } from "@/lib/supabase/env";

// Server-only, never cached. Hourly reminder sweep (habit + food-log nudges).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Hourly reminders cron. Vercel Cron hits this each hour; when CRON_SECRET is
 * set it's sent as a Bearer token and required, so strangers can't trigger it.
 * The hourly cadence naturally dedupes — a habit only matches at its own hour.
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
    const report = await runReminderSweep();
    return NextResponse.json({ ok: true, ...report, configuredSecret: Boolean(secret) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "sweep failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
