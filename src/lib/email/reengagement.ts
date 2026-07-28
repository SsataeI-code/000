/**
 * Re-engagement email (§10 "email is a re-engagement channel only — triggered
 * after 3 consecutive days of no app use"). Warm and forgiving, escalating
 * gently at 3 → 5 → 7 days, never shaming (§4 voice). Content is pure and
 * testable; sending is gated on the owner providing a provider key.
 */

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export function reengagementContent(name: string | null, dayCount: number): EmailContent {
  const first = name?.split(" ")[0] ?? "there";
  const line =
    dayCount >= 7
      ? `It's been about a week — and that's completely okay. No streak, no guilt. One small thing today is all it takes to feel back in it. I'd love to see you.`
      : dayCount >= 5
        ? `A few days away is nothing — life gets full. Whenever you're ready, your habits are right where you left them. Want to knock out just one today?`
        : `Just checking in — no pressure at all. A quick 30 seconds in the app keeps your momentum alive. You've got this.`;

  const subject =
    dayCount >= 7 ? `${first}, your spot's still here` : dayCount >= 5 ? `${first}, one small win today?` : `${first}, quick check-in`;

  const text = `Hey ${first},\n\n${line}\n\nOpen Total Form Fitness whenever you're ready.\n\n— Your coach`;

  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#0c0c0d">
  <p style="font-size:18px;font-weight:700;text-transform:uppercase;letter-spacing:-0.01em;margin:0 0 12px">Hey ${first},</p>
  <p style="font-size:15px;line-height:1.5;color:#0c0c0dcc;margin:0 0 20px">${line}</p>
  <p style="margin:0 0 24px"><a href="https://total-form-fitness.vercel.app/client" style="display:inline-block;background:#e10600;color:#fff;text-decoration:none;font-weight:600;text-transform:uppercase;letter-spacing:0.02em;font-size:13px;padding:12px 20px">Open the app</a></p>
  <p style="font-size:12px;color:#0c0c0d80;margin:0">— Your coach · Total Form Fitness</p>
</div>`;

  return { subject, text, html };
}
