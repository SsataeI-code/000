"use client";

import { useState, useTransition } from "react";
import { sendTestEmailAction } from "@/lib/email/actions";

/** Owner/coach: fire a sample re-engagement email to any address to verify Resend. */
export function TestEmailButton({ defaultEmail }: { defaultEmail?: string }) {
  const [pending, start] = useTransition();
  const [to, setTo] = useState(defaultEmail ?? "");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <section className="border border-hairline bg-surface p-5">
      <p className="font-label text-xs uppercase tracking-wide text-ink/50">Email delivery</p>
      <p className="mt-1 font-body text-sm text-ink/70">Send a sample re-engagement email to check it arrives.</p>
      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="test-email" className="sr-only">Send to</label>
          <input
            id="test-email"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="you@example.com"
            className="min-h-tap w-full border border-hairline bg-surface px-3 py-2 font-body text-sm text-ink placeholder:text-ink/40 focus:border-ink"
          />
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => setResult(await sendTestEmailAction(to)))}
          className="min-h-tap shrink-0 border border-ink px-4 py-2 font-label text-xs uppercase tracking-wide text-ink hover:border-red hover:text-red disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send test"}
        </button>
      </div>
      {result ? (
        <p className={`mt-3 font-body text-sm ${result.ok ? "text-success" : "text-red"}`}>{result.message}</p>
      ) : null}
    </section>
  );
}
