"use server";

import { getSessionUser } from "@/lib/auth/session";
import { sendReengagementEmail } from "@/lib/email/send";

export interface TestEmailResult {
  ok: boolean;
  message: string;
}

/**
 * Owner/coach-only: send a sample re-engagement email to your own address to
 * confirm the provider is wired up. Uses the real email path so a success here
 * means the 3/5/7-day emails will send too.
 */
export async function sendTestEmailAction(toRaw?: string): Promise<TestEmailResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== "coach" && user.role !== "owner")) {
    return { ok: false, message: "Not allowed." };
  }
  const to = (toRaw?.trim() || user.email || "").trim();
  if (!to) return { ok: false, message: "Enter an email address to send to." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, message: "That doesn't look like a valid email." };

  const res = await sendReengagementEmail({ to, name: user.profile?.display_name ?? null, dayCount: 3 });
  if (res.sent) return { ok: true, message: `Sent to ${to}. Check the inbox (and spam).` };
  if (res.skipped === "no RESEND_API_KEY") {
    return { ok: false, message: "RESEND_API_KEY isn't set in Vercel yet (or the deploy hasn't picked it up)." };
  }
  return { ok: false, message: `Provider rejected it: ${res.skipped}. With the test sender, Resend only delivers to your Resend signup email until you verify a domain.` };
}
