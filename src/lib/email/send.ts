import { reengagementContent } from "@/lib/email/reengagement";
import { newMessageEmailContent } from "@/lib/email/new-message";
import { sanitizeHeaderSafe } from "@/lib/supabase/env";

/**
 * Send the re-engagement email via Resend (§17 provider choice). Gated on the
 * owner supplying RESEND_API_KEY — until then it's a graceful no-op so the rest
 * of the sweep (in-app nudges, coach alerts) still runs. EMAIL_FROM overrides
 * the default sender.
 */
export async function sendReengagementEmail(params: {
  to: string;
  name: string | null;
  dayCount: number;
}): Promise<{ sent: boolean; skipped?: string }> {
  const key = sanitizeHeaderSafe(process.env.RESEND_API_KEY);
  if (!key) return { sent: false, skipped: "no RESEND_API_KEY" };
  const from = process.env.EMAIL_FROM || "Total Form Fitness <onboarding@resend.dev>";

  const { subject, text, html } = reengagementContent(params.name, params.dayCount);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: params.to, subject, text, html }),
    });
    return res.ok ? { sent: true } : { sent: false, skipped: `resend ${res.status}` };
  } catch {
    return { sent: false, skipped: "resend request failed" };
  }
}

/**
 * Email the coach when a client messages them in the app (owner request). Gated
 * on RESEND_API_KEY — a graceful no-op without it, so in-app + push still fire.
 */
export async function sendNewMessageEmail(params: {
  to: string;
  clientName: string;
  preview: string;
  clientId: string;
}): Promise<{ sent: boolean; skipped?: string }> {
  const key = sanitizeHeaderSafe(process.env.RESEND_API_KEY);
  if (!key) return { sent: false, skipped: "no RESEND_API_KEY" };
  const from = process.env.EMAIL_FROM || "Total Form Fitness <onboarding@resend.dev>";

  const { subject, text, html } = newMessageEmailContent(params.clientName, params.preview, params.clientId);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: params.to, subject, text, html }),
    });
    return res.ok ? { sent: true } : { sent: false, skipped: `resend ${res.status}` };
  } catch {
    return { sent: false, skipped: "resend request failed" };
  }
}
