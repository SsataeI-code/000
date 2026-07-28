"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { processReferralAction } from "@/lib/referrals/actions";
import { referralStatusLabel } from "@/lib/referrals/code";
import type { CoachReferral } from "@/lib/referrals/data";

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

/**
 * One referral in the coach's queue (§8). The coach rewards (10% default, or a
 * custom note) or waives — the app never applies a discount itself; money lives
 * outside the app.
 */
export function ReferralRow({ referral }: { referral: CoachReferral }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState(referral.reward_note ?? "");
  const [error, setError] = useState<string | null>(null);
  const decided = referral.status !== "joined";

  function act(status: "rewarded" | "declined") {
    setError(null);
    start(async () => {
      const res = await processReferralAction(referral.id, status, note);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <li className={`border border-hairline bg-surface p-4 ${pending ? "opacity-70" : ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-body text-base text-ink">
          <span className="text-ink">{referral.referrerName}</span>
          <span className="text-ink/50"> referred </span>
          <span className="text-ink">{referral.referredName}</span>
        </p>
        <span className="shrink-0 font-body text-xs text-ink/40">{dateLabel(referral.created_at)}</span>
      </div>

      <p
        className={`mt-1 font-label text-[11px] uppercase tracking-wide ${
          referral.status === "rewarded"
            ? "text-success"
            : referral.status === "declined"
              ? "text-ink/40"
              : "text-red"
        }`}
      >
        {referralStatusLabel(referral.status)}
        {decided && referral.reward_note ? <span className="text-ink/50"> · {referral.reward_note}</span> : null}
      </p>

      {!decided ? (
        <div className="mt-3 flex flex-col gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Reward note (e.g. 10% off next month)"
            aria-label="Reward note"
            className="min-h-tap w-full border border-hairline bg-surface-muted px-3 py-2 font-body text-sm text-ink placeholder:text-ink/40 focus:border-ink"
          />
          {error ? <p role="alert" className="font-body text-sm text-red-ink">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => act("rewarded")}
              className="min-h-tap flex-1 bg-red px-3 py-2 font-label text-xs font-600 uppercase tracking-wide text-white hover:bg-red-ink disabled:opacity-50"
            >
              Mark rewarded
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => act("declined")}
              className="min-h-tap flex-1 border border-hairline px-3 py-2 font-label text-xs uppercase tracking-wide text-ink/70 hover:border-red disabled:opacity-50"
            >
              Waive
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
