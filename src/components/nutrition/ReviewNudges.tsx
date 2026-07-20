import Link from "next/link";
import { recalcTargetsAction } from "@/lib/nutrition/actions";

/**
 * Weekly / monthly review nudges (§5B recalc cadence; behavior-change loop).
 * Gentle, dismissible-by-acting prompts to keep habits and targets current.
 */
export function ReviewNudges({
  showWeeklyReview,
  showRecalc,
}: {
  showWeeklyReview: boolean;
  showRecalc: boolean;
}) {
  if (!showWeeklyReview && !showRecalc) return null;
  return (
    <div className="flex flex-col gap-3">
      {showWeeklyReview ? (
        <div className="flex items-center justify-between gap-3 border-l-4 border-red bg-surface p-4">
          <p className="font-body text-sm text-ink/80">
            New week — take 30 seconds to review your habits. Add, drop, or tweak one.
          </p>
          <Link
            href="/client/habits"
            className="shrink-0 min-h-tap font-label text-xs uppercase tracking-wide text-red underline underline-offset-4"
          >
            Review
          </Link>
        </div>
      ) : null}

      {showRecalc ? (
        <form action={recalcTargetsAction} className="flex items-center justify-between gap-3 border-l-4 border-ink bg-surface p-4">
          <p className="font-body text-sm text-ink/80">
            It&apos;s been a few weeks — refresh your calorie &amp; macro targets from your latest weight.
          </p>
          <button
            type="submit"
            className="shrink-0 min-h-tap font-label text-xs uppercase tracking-wide text-ink underline underline-offset-4 hover:text-red"
          >
            Refresh
          </button>
        </form>
      ) : null}
    </div>
  );
}
