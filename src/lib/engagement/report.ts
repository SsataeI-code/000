/**
 * Weekly report scheduling (§12 "Weekly (default), in-app + a notification").
 * Pure and tested: decides whether the daily sweep should fire the weekly recap
 * today. Fires on the configured day of week (default Monday) and never twice in
 * the same week (a ≥6-day gap since the last one).
 */

/** Default report day: Monday (0 = Sunday … 1 = Monday, UTC). */
export const REPORT_DOW = 1;

export function shouldSendWeeklyReport(today: string, lastReportOn: string | null, reportDow = REPORT_DOW): boolean {
  const d = new Date(`${today}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  if (d.getUTCDay() !== reportDow) return false;
  if (!lastReportOn) return true;
  const last = new Date(`${lastReportOn}T00:00:00Z`);
  if (Number.isNaN(last.getTime())) return true;
  const days = Math.floor((d.getTime() - last.getTime()) / 86_400_000);
  return days >= 6;
}
