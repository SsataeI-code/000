"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addWaterAction } from "@/lib/body/actions";

/**
 * Dedicated water tracker (§5 hydration) — its own progress on Today with
 * one-tap quick-add. A first-class feature, not a generic habit.
 */
export function WaterTracker({ consumedMl, goalMl }: { consumedMl: number; goalMl: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const pct = goalMl > 0 ? Math.min(consumedMl / goalMl, 1) : 0;
  const ML_PER_OZ = 29.5735;
  const BOTTLE_ML = 500; // a standard 16.9 fl oz bottle
  const oz = Math.round(consumedMl / ML_PER_OZ);
  const goalOz = Math.round(goalMl / ML_PER_OZ);
  const bottles = Math.round((consumedMl / BOTTLE_ML) * 10) / 10;

  function add(ml: number) {
    start(async () => {
      await addWaterAction(ml);
      router.refresh();
    });
  }

  return (
    <section aria-label="Water" className={`border border-hairline bg-surface p-5 ${pending ? "opacity-80" : ""}`}>
      <div className="flex items-baseline justify-between">
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Water</p>
        <p className="font-body text-sm text-ink/70">
          {oz} / {goalOz} oz
          <span className="text-ink/40"> · {bottles} bottles</span>
        </p>
      </div>

      <div className="mt-3 h-3 w-full overflow-hidden bg-hairline">
        <div
          className="h-full"
          style={{ width: `${pct * 100}%`, background: "#1f6d8a", transition: "width 500ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => add(BOTTLE_ML)} disabled={pending}
          className="min-h-tap bg-ink px-4 py-2 font-label text-xs font-600 uppercase tracking-wide text-surface hover:opacity-90 disabled:opacity-50">
          +1 bottle (16.9 oz)
        </button>
        <button type="button" onClick={() => add(240)} disabled={pending}
          className="min-h-tap border border-ink px-4 py-2 font-label text-xs font-600 uppercase tracking-wide text-ink hover:bg-surface-muted disabled:opacity-50">
          +1 cup (8 oz)
        </button>
        {consumedMl > 0 ? (
          <button type="button" onClick={() => add(-BOTTLE_ML)} disabled={pending}
            className="min-h-tap px-3 py-2 font-label text-xs uppercase tracking-wide text-ink/50 underline underline-offset-4 hover:text-red disabled:opacity-50">
            Undo bottle
          </button>
        ) : null}
      </div>
    </section>
  );
}
