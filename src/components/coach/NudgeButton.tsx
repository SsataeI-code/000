"use client";

import { useState, useTransition } from "react";
import { sendNudgeAction } from "@/lib/messages/actions";

/**
 * One-tap auto-nudge (§9). The coach reviews who's slipping and taps to send a
 * warm, app-labeled nudge in their brand voice — the coach is the last tap
 * (§11). Phase 5 will let the AI draft it from the client's real data first.
 */
export function NudgeButton({ clientId, primary }: { clientId: string; primary: string }) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (sent) {
    return <span className="font-label text-[10px] uppercase tracking-wide text-success">Nudge sent ✓</span>;
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setErr(null);
            const r = await sendNudgeAction(clientId, primary);
            if (r.error) setErr(r.error);
            else setSent(true);
          })
        }
        className="min-h-tap border border-ink px-2.5 py-1 font-label text-[10px] uppercase tracking-wide text-ink hover:border-red hover:text-red disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send nudge"}
      </button>
      {err ? <span className="font-body text-[10px] text-red">{err}</span> : null}
    </span>
  );
}
