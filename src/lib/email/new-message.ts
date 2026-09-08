const APP_URL = "https://total-form-fitness.vercel.app";

/**
 * Coach email: a client just reached out in the app (owner request — "email me
 * when clients try to reach out"). Pure content, warm and short, with a preview
 * and a deep link to the thread. No client health data beyond the message text
 * they chose to send.
 */
export function newMessageEmailContent(clientName: string, preview: string, clientId: string) {
  const name = clientName.trim() || "A client";
  const trimmed = preview.length > 300 ? `${preview.slice(0, 300)}…` : preview;
  const link = `${APP_URL}/coach/messages/${clientId}`;
  const subject = `New message from ${name}`;
  const text = `${name} messaged you in Total Form Fitness:\n\n"${trimmed}"\n\nReply: ${link}`;
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:8px 4px;color:#111">
  <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#e10600;font-weight:700">New client message</p>
  <p style="margin:0 0 16px;font-size:18px;font-weight:700">${escapeHtml(name)} reached out</p>
  <blockquote style="margin:0 0 20px;padding:12px 16px;background:#f4f4f2;border-left:3px solid #e10600;font-size:15px;color:#333">${escapeHtml(trimmed)}</blockquote>
  <p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#e10600;color:#fff;text-decoration:none;font-weight:600;text-transform:uppercase;letter-spacing:0.02em;font-size:13px;padding:12px 20px">Reply in the app</a></p>
  <p style="margin:0;font-size:12px;color:#888">You're getting this because a client messaged you in Total Form Fitness.</p>
</div>`;
  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
