import type { SlipLevel } from "@/lib/coach/slip";

/**
 * Daily engagement sweep decisions (§9 auto-nudge, §10 re-engagement email).
 * Pure and testable: given a client's current inactivity + a small per-client
 * state row, decide what fires today — an auto app-nudge, a coach alert, or the
 * re-engagement email — and return the next state so nothing fires twice for the
 * same quiet spell. A daily cron feeds this; the coach never has to babysit it.
 */

export const EMAIL_LADDER = [3, 5, 7] as const; // days quiet → email milestones
export const COACH_ALERT_DAYS = 3; // notify the coach once a client is quiet this long
export const NUDGE_COOLDOWN_DAYS = 2; // don't auto-nudge more often than this

export interface EngagementState {
  lastActivityOn: string | null; // the activity date this spell is measured from
  coachAlerted: boolean; // coach already alerted for the current quiet spell
  emailedThreshold: number; // highest email milestone already sent this spell
  lastNudgeOn: string | null; // date of the last auto-nudge (cooldown)
}

export interface EngagementDecision {
  sendNudge: boolean;
  alertCoach: boolean;
  emailDay: number | null; // 3 | 5 | 7 to send that milestone, else null
  nextState: EngagementState;
}

const DAY = 86_400_000;
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY);
}

export function decideEngagement(params: {
  today: string; // iso date
  lastActivityOn: string | null; // most recent activity date, null if never
  daysSinceActivity: number; // Infinity if never active
  slipLevel: SlipLevel;
  state: EngagementState;
}): EngagementDecision {
  const { today, lastActivityOn, daysSinceActivity, slipLevel, state } = params;

  // A client who has never done anything has nothing to re-engage from yet.
  if (lastActivityOn == null) {
    return { sendNudge: false, alertCoach: false, emailDay: null, nextState: { ...state, lastActivityOn } };
  }

  // New quiet spell (they were active more recently than we last recorded):
  // reset the per-spell counters so alerts/emails can fire fresh.
  const next: EngagementState =
    lastActivityOn !== state.lastActivityOn
      ? { lastActivityOn, coachAlerted: false, emailedThreshold: 0, lastNudgeOn: state.lastNudgeOn }
      : { ...state };

  // Auto-nudge: a small, recoverable slip, at most once per cooldown window.
  const nudgeReady = state.lastNudgeOn == null || daysBetween(today, state.lastNudgeOn) >= NUDGE_COOLDOWN_DAYS;
  const sendNudge = slipLevel === "nudge" && nudgeReady;
  if (sendNudge) next.lastNudgeOn = today;

  // Alert the coach once the client crosses the quiet threshold — once per spell.
  const alertCoach = daysSinceActivity >= COACH_ALERT_DAYS && !next.coachAlerted;
  if (alertCoach) next.coachAlerted = true;

  // Email ladder: send the highest milestone reached that we haven't sent yet
  // (one email per run, so a missed cron day never fires a burst).
  let emailDay: number | null = null;
  for (const t of EMAIL_LADDER) {
    if (daysSinceActivity >= t && t > next.emailedThreshold) emailDay = t;
  }
  if (emailDay != null) next.emailedThreshold = emailDay;

  return { sendNudge, alertCoach, emailDay, nextState: next };
}
