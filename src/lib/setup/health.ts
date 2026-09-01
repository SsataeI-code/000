import { createClient } from "@/lib/supabase/server";

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
  /** What to run/set to fix it (only when not ok). */
  fix?: string;
}

export interface HealthReport {
  tables: Check[];
  columns: Check[];
  env: Check[];
  okCount: number;
  total: number;
}

/** Expected table → the SQL file that creates it (for the fix hint). */
const TABLES: { table: string; label: string; fix: string }[] = [
  { table: "profiles", label: "Accounts & roles", fix: "run-everything.sql (0001)" },
  { table: "coach_clients", label: "Coach ↔ client links", fix: "run-everything.sql (0001)" },
  { table: "client_profiles", label: "Client profiles", fix: "run-everything.sql (0003)" },
  { table: "nutrition_targets", label: "Nutrition targets", fix: "run-everything.sql (0003)" },
  { table: "food_logs", label: "Food logs", fix: "run-everything.sql (0003)" },
  { table: "meals", label: "Saved meals", fix: "run-everything.sql (0004)" },
  { table: "habits", label: "Habits", fix: "run-everything.sql (0005)" },
  { table: "habit_logs", label: "Habit check-offs", fix: "run-everything.sql (0005)" },
  { table: "water_logs", label: "Water tracker", fix: "run-everything.sql (0006)" },
  { table: "body_measurements", label: "Weight & body", fix: "run-everything.sql (0006)" },
  { table: "coach_prefs", label: "Dashboard / client-screen layout", fix: "phase3_coach_prefs.sql (0008)" },
  { table: "messages", label: "Coach ↔ client chat", fix: "phase4_messages.sql (0009)" },
  { table: "notifications", label: "In-app notifications", fix: "phase4_notifications.sql (0010)" },
  { table: "engagement_state", label: "Daily engagement sweep", fix: "phase4_engagement.sql (0011)" },
  { table: "push_subscriptions", label: "PWA push", fix: "phase4_push.sql (0012)" },
  { table: "referrals", label: "Referrals", fix: "phase6_referrals.sql (0013)" },
  { table: "content_overrides", label: "CMS copy & images", fix: "phase6_content.sql (0014)" },
  { table: "client_screen_overrides", label: "Per-client Today screen", fix: "phase6_client_screen_overrides.sql (0017)" },
  { table: "body_photos", label: "Progress photos", fix: "phase2_body_photos.sql (0018)" },
  { table: "wearable_connections", label: "Wearables (connect)", fix: "phase7_wearables.sql (0020)" },
  { table: "wearable_daily", label: "Wearables (data)", fix: "phase7_wearable_daily.sql (0022)" },
  { table: "lift_logs", label: "Lift tracker", fix: "phase-lifts.sql (0026)" },
];

/** Important columns added by later migrations (feature-gating fixes). */
const COLUMNS: { table: string; column: string; label: string; fix: string }[] = [
  { table: "client_profiles", column: "strictness", label: "Nutrition strictness", fix: "phase-strictness.sql (0023)" },
  { table: "client_profiles", column: "diet_pattern", label: "Diet pattern & food avoid", fix: "phase-diet.sql (0025)" },
  { table: "client_profiles", column: "quiet_start", label: "Quiet hours", fix: "phase4_quiet_hours.sql (0015)" },
  { table: "engagement_state", column: "last_report_on", label: "Weekly reports", fix: "phase7_weekly_reports.sql (0021)" },
];

/** Loosely-typed client so we can probe arbitrary table/column names by string. */
interface LooseQuery extends PromiseLike<{ error: unknown }> {
  limit: (n: number) => PromiseLike<{ error: unknown }>;
}
interface LooseClient {
  from: (table: string) => { select: (cols: string, opts?: { count?: "exact"; head?: boolean }) => LooseQuery };
}

/** A missing relation/column surfaces as a Postgres error — not just empty rows. */
async function probe(run: () => PromiseLike<{ error: unknown }>): Promise<boolean> {
  try {
    const { error } = await run();
    return !error;
  } catch {
    return false;
  }
}

function envCheck(name: string, label: string, required: boolean): Check {
  const set = !!process.env[name];
  return {
    name: label,
    ok: set || !required,
    detail: set ? "Set" : required ? "Missing (required)" : "Not set (optional)",
    fix: set ? undefined : `Set ${name} in Vercel → Settings → Environment Variables`,
  };
}

/**
 * Read-only setup health probe (owner tool). Checks that each table/column the
 * app relies on actually exists in the connected Supabase, and which env vars
 * are set — so an owner can see at a glance what still needs running/configuring
 * instead of finding out when a feature silently fails.
 */
export async function getSetupHealth(): Promise<HealthReport> {
  const sb = (await createClient()) as unknown as LooseClient;

  const tables: Check[] = await Promise.all(
    TABLES.map(async (t) => {
      const ok = await probe(() => sb.from(t.table).select("*", { count: "exact", head: true }));
      return { name: t.label, ok, detail: ok ? `${t.table} ✓` : `${t.table} — not found`, fix: ok ? undefined : `Run ${t.fix}` };
    }),
  );

  const columns: Check[] = await Promise.all(
    COLUMNS.map(async (c) => {
      const ok = await probe(() => sb.from(c.table).select(c.column, { head: true }).limit(1));
      return { name: c.label, ok, detail: ok ? `${c.table}.${c.column} ✓` : `${c.table}.${c.column} — missing`, fix: ok ? undefined : `Run ${c.fix}` };
    }),
  );

  const env: Check[] = [
    envCheck("NEXT_PUBLIC_SUPABASE_URL", "Supabase URL", true),
    envCheck("NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase anon key", true),
    envCheck("SUPABASE_SERVICE_ROLE_KEY", "Service role key (delete, sweep)", true),
    envCheck("NEXT_PUBLIC_SITE_URL", "Site URL (links, referrals, email)", false),
    envCheck("CRON_SECRET", "Cron secret (daily nudges & reports)", false),
    envCheck("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "Push public key", false),
    envCheck("VAPID_PRIVATE_KEY", "Push private key", false),
    envCheck("RESEND_API_KEY", "Email (Resend)", false),
    envCheck("ANTHROPIC_API_KEY", "AI assistant (optional)", false),
  ];

  const all = [...tables, ...columns, ...env];
  return { tables, columns, env, okCount: all.filter((c) => c.ok).length, total: all.length };
}
