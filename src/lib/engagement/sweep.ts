import { createAdminClient } from "@/lib/supabase/admin";
import { isoDate, addDays } from "@/lib/habits/streaks";
import { computeAttention } from "@/lib/coach/attention";
import { classifySlip, draftNudge } from "@/lib/coach/slip";
import { decideEngagement, type EngagementState } from "@/lib/engagement/decide";
import { sendReengagementEmail } from "@/lib/email/send";
import { sendPush } from "@/lib/push/send";
import type { Goal } from "@/lib/types/db";

export interface SweepReport {
  clients: number;
  nudged: number;
  coachAlerts: number;
  emailsSent: number;
  emailsSkipped: number;
}

const DAY = 86_400_000;
function daysSince(iso: string | null | undefined): number {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(`${iso}T00:00:00Z`).getTime()) / DAY);
}
function latest(rows: { client_id: string; log_date: string }[] | null): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows ?? []) if (!m.has(r.client_id)) m.set(r.client_id, r.log_date);
  return m;
}
function maxDate(...ds: (string | undefined)[]): string | null {
  let best: string | null = null;
  for (const d of ds) if (d && (best == null || d > best)) best = d;
  return best;
}

/**
 * The daily engagement sweep (§9 auto-nudge, §10 coach alert + re-engagement
 * email). Runs server-side under the service role via the cron route. Defensive:
 * a failure on one client never aborts the rest.
 */
export async function runEngagementSweep(): Promise<SweepReport> {
  const supabase = createAdminClient();
  const today = isoDate(new Date());
  const report: SweepReport = { clients: 0, nudged: 0, coachAlerts: 0, emailsSent: 0, emailsSkipped: 0 };

  const { data: clients } = await supabase.from("profiles").select("id,display_name").eq("role", "client");
  const ids = (clients ?? []).map((c) => c.id);
  report.clients = ids.length;
  if (ids.length === 0) return report;

  const since = isoDate(addDays(new Date(), -60));
  const [cprofiles, food, habitL, water, habits, body, states, links, ownerRow] = await Promise.all([
    supabase.from("client_profiles").select("id,goal").in("id", ids),
    supabase.from("food_logs").select("client_id,log_date").in("client_id", ids).order("log_date", { ascending: false }),
    supabase.from("habit_logs").select("client_id,log_date").in("client_id", ids).order("log_date", { ascending: false }),
    supabase.from("water_logs").select("client_id,log_date").in("client_id", ids).order("log_date", { ascending: false }),
    supabase.from("habits").select("client_id").in("client_id", ids).eq("active", true),
    supabase.from("body_measurements").select("client_id,log_date,weight_kg").in("client_id", ids).gte("log_date", since).not("weight_kg", "is", null).order("log_date", { ascending: true }),
    supabase.from("engagement_state").select("*").in("client_id", ids),
    supabase.from("coach_clients").select("client_id,coach_id").in("client_id", ids).eq("status", "active"),
    supabase.from("profiles").select("id").eq("role", "owner").limit(1).maybeSingle(),
  ]);

  const nameById = new Map((clients ?? []).map((c) => [c.id, c.display_name ?? "there"]));
  const goalById = new Map((cprofiles.data ?? []).map((p) => [p.id, p.goal as Goal]));
  const lastFood = latest(food.data);
  const lastHabit = latest(habitL.data);
  const lastWater = latest(water.data);
  const hasHabits = new Set((habits.data ?? []).map((h) => h.client_id));
  const coachByClient = new Map((links.data ?? []).map((l) => [l.client_id, l.coach_id]));
  const ownerId = ownerRow.data?.id ?? null;
  const stateByClient = new Map((states.data ?? []).map((s) => [s.client_id, s]));

  const wFirst = new Map<string, number>();
  const wLast = new Map<string, number>();
  const wCount = new Map<string, number>();
  for (const r of body.data ?? []) {
    if (!wFirst.has(r.client_id)) wFirst.set(r.client_id, Number(r.weight_kg));
    wLast.set(r.client_id, Number(r.weight_kg));
    wCount.set(r.client_id, (wCount.get(r.client_id) ?? 0) + 1);
  }

  for (const id of ids) {
    try {
      const dFood = daysSince(lastFood.get(id));
      const dHabit = daysSince(lastHabit.get(id));
      const dWater = daysSince(lastWater.get(id));
      const lastActivityOn = maxDate(lastFood.get(id), lastHabit.get(id), lastWater.get(id));
      const dActivity = daysSince(lastActivityOn);
      const goal = goalById.get(id) ?? "maintain";
      const hasWeightTrend = (wCount.get(id) ?? 0) >= 2;
      const weightChangeKg = hasWeightTrend ? Math.round((wLast.get(id)! - wFirst.get(id)!) * 10) / 10 : 0;

      const { flags, score } = computeAttention({
        daysSinceActivity: dActivity,
        daysSinceFood: dFood,
        daysSinceHabit: dHabit,
        hasHabits: hasHabits.has(id),
        goal,
        weightChangeKg,
        hasWeightTrend,
      });
      const slip = classifySlip(flags, score);

      const prior = stateByClient.get(id);
      const state: EngagementState = {
        lastActivityOn: prior?.last_activity_on ?? null,
        coachAlerted: prior?.coach_alerted ?? false,
        emailedThreshold: prior?.emailed_threshold ?? 0,
        lastNudgeOn: prior?.last_nudge_on ?? null,
      };

      const decision = decideEngagement({ today, lastActivityOn, daysSinceActivity: dActivity, slipLevel: slip.level, state });
      const coachId = coachByClient.get(id) ?? ownerId;
      const name = nameById.get(id) ?? "there";

      // Auto-nudge (app, in the coach's voice) — labeled kind "nudge".
      if (decision.sendNudge && coachId) {
        const body = draftNudge(name, slip.primary);
        await supabase.from("messages").insert({ coach_id: coachId, client_id: id, sender_id: coachId, kind: "nudge", body });
        await supabase.from("notifications").insert({ recipient_id: id, kind: "nudge", title: "A little nudge for today", body: body.slice(0, 140), link: "/client/messages" });
        await sendPush(id, { title: "A little nudge for today", body: body.slice(0, 140), link: "/client/messages" });
        report.nudged++;
      }

      // Coach alert after 3 quiet days (§ "notify me after 3 days").
      if (decision.alertCoach && coachId) {
        const alertBody = `No app activity for ${Number.isFinite(dActivity) ? dActivity : "several"} days — might be time to reach out.`;
        await supabase.from("notifications").insert({
          recipient_id: coachId,
          kind: "system",
          title: `${name} has gone quiet`,
          body: alertBody,
          link: `/coach/clients/${id}`,
        });
        await sendPush(coachId, { title: `${name} has gone quiet`, body: alertBody, link: `/coach/clients/${id}` });
        report.coachAlerts++;
      }

      // Re-engagement at 3 / 5 / 7 days: always an in-app touch + push (the
      // default channels), plus the email when a provider is configured.
      if (decision.emailDay != null) {
        const t = decision.emailDay;
        const title = t >= 7 ? "Your spot's still here" : t >= 5 ? "One small win today?" : "We miss you";
        const reBody = "No pressure — even 30 seconds today keeps your momentum. Open the app whenever you're ready.";
        await supabase.from("notifications").insert({ recipient_id: id, kind: "system", title, body: reBody, link: "/client" });
        await sendPush(id, { title, body: reBody, link: "/client" });

        const { data: userRes } = await supabase.auth.admin.getUserById(id);
        const email = userRes?.user?.email ?? null;
        if (email) {
          const r = await sendReengagementEmail({ to: email, name, dayCount: t });
          if (r.sent) report.emailsSent++;
          else report.emailsSkipped++;
        } else {
          report.emailsSkipped++;
        }
      }

      // Persist the next state so nothing double-fires.
      await supabase.from("engagement_state").upsert(
        {
          client_id: id,
          last_activity_on: decision.nextState.lastActivityOn,
          coach_alerted: decision.nextState.coachAlerted,
          emailed_threshold: decision.nextState.emailedThreshold,
          last_nudge_on: decision.nextState.lastNudgeOn,
        },
        { onConflict: "client_id" },
      );
    } catch {
      // Never let one client's failure abort the sweep.
    }
  }

  return report;
}
