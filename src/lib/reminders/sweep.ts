import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push/send";
import { isScheduledOn } from "@/lib/habits/streaks";
import { dayInTimeZone } from "@/lib/time/day";
import type { Habit } from "@/lib/types/db";

export interface ReminderReport {
  clients: number;
  habitReminders: number;
  foodReminders: number;
}

/** Evening hour (client-local) for the "haven't logged food today" nudge. */
const FOOD_REMINDER_HOUR = 19;

/** Current hour (0–23) in an IANA timezone. Falls back to UTC. */
function localHour(tz: string, now: Date): number {
  try {
    const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz || "UTC", hour: "2-digit", hour12: false }).format(now));
    return Number.isFinite(h) ? h % 24 : now.getUTCHours();
  } catch {
    return now.getUTCHours();
  }
}

/** Hour component of a "HH:MM[:SS]" time string. */
function hourOf(t: string | null): number | null {
  if (!t) return null;
  const h = Number(t.slice(0, 2));
  return Number.isFinite(h) ? h : null;
}

/**
 * Hourly reminder sweep (§ accountability — proactive reminders drive results).
 * For each client, at their local reminder hour, nudges the habits they set a
 * reminder for and still owe today; and at a fixed evening hour, nudges an
 * active food-logger who hasn't logged today. In-app notification + push.
 * Runs under the service role. The hourly cadence is the natural dedupe — a
 * habit only matches during its own reminder hour, once a day.
 */
export async function runReminderSweep(now: Date = new Date()): Promise<ReminderReport> {
  const supabase = createAdminClient();
  const report: ReminderReport = { clients: 0, habitReminders: 0, foodReminders: 0 };

  // Clients (id + their local timezone).
  const { data: profiles } = await supabase.from("client_profiles").select("id, timezone");
  const clients = (profiles ?? []) as { id: string; timezone: string | null }[];
  if (clients.length === 0) return report;
  report.clients = clients.length;
  const ids = clients.map((c) => c.id);

  // Habits that carry a reminder time.
  const { data: habitRows } = await supabase
    .from("habits")
    .select("id, client_id, name, cadence, days_of_week, times_per_week, reminder_time, active")
    .in("client_id", ids)
    .eq("active", true)
    .not("reminder_time", "is", null);
  const habitsByClient = new Map<string, Habit[]>();
  for (const h of (habitRows ?? []) as Habit[]) {
    const arr = habitsByClient.get(h.client_id) ?? [];
    arr.push(h);
    habitsByClient.set(h.client_id, arr);
  }

  // Completions over the last 2 days (covers any client's "today").
  const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
  const { data: doneRows } = await supabase
    .from("habit_logs")
    .select("habit_id, log_date, completed")
    .in("client_id", ids)
    .gte("log_date", twoDaysAgo);
  const doneSet = new Set<string>();
  for (const r of (doneRows ?? []) as { habit_id: string; log_date: string; completed: boolean }[]) {
    if (r.completed) doneSet.add(`${r.habit_id}|${r.log_date}`);
  }

  // Recent food logs (for the evening "you haven't logged today" nudge).
  const { data: foodRows } = await supabase
    .from("food_logs")
    .select("client_id, log_date")
    .in("client_id", ids)
    .gte("log_date", twoDaysAgo);
  const foodByDay = new Set<string>();
  for (const r of (foodRows ?? []) as { client_id: string; log_date: string }[]) {
    foodByDay.add(`${r.client_id}|${r.log_date}`);
  }

  for (const c of clients) {
    try {
      const tz = c.timezone || "UTC";
      const lh = localHour(tz, now);
      const ld = dayInTimeZone(tz, now);
      const asDate = new Date(`${ld}T12:00:00Z`);

      // Habit reminders due this hour.
      const due = (habitsByClient.get(c.id) ?? []).filter(
        (h) => hourOf(h.reminder_time) === lh && isScheduledOn(h, asDate) && !doneSet.has(`${h.id}|${ld}`),
      );
      if (due.length > 0) {
        const names = due.map((h) => h.name);
        const title = due.length === 1 ? `Time to check off ${names[0]}` : `${due.length} habits to check off`;
        const body = due.length === 1 ? "A quick tap keeps your streak alive." : names.join(", ");
        await supabase.from("notifications").insert({ recipient_id: c.id, kind: "nudge", title, body: body.slice(0, 140), link: "/client" });
        await sendPush(c.id, { title, body: body.slice(0, 140), link: "/client" });
        report.habitReminders++;
      }

      // Evening food-log nudge for an active logger who hasn't logged today.
      const yd = dayInTimeZone(tz, new Date(now.getTime() - 86_400_000));
      if (lh === FOOD_REMINDER_HOUR && foodByDay.has(`${c.id}|${yd}`) && !foodByDay.has(`${c.id}|${ld}`)) {
        const title = "Haven't logged today";
        const body = "A few taps to log dinner keeps your numbers honest.";
        await supabase.from("notifications").insert({ recipient_id: c.id, kind: "nudge", title, body, link: "/client/food" });
        await sendPush(c.id, { title, body, link: "/client/food" });
        report.foodReminders++;
      }
    } catch {
      // one client's failure never stops the sweep
    }
  }

  return report;
}
