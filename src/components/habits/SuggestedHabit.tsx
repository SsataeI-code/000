"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adoptSuggestedHabitAction } from "@/lib/habits/actions";
import type { HabitCategory } from "@/lib/types/db";

const CATEGORY_DOT: Record<HabitCategory, string> = {
  nutrition: "#e10600", movement: "#f4f4f2", sleep: "#34c759",
  mindfulness: "#8a6d1f", hydration: "#1f6d8a", recovery: "#5a1f8a",
};

/**
 * The adaptive "next right habit" suggestion (§5A). Appears only when the last
 * habit has stuck; the client adopts it in one tap (their coach is notified and
 * can veto). Warm framing — a nudge forward, never pressure.
 */
export function SuggestedHabit({ name, category, why }: { name: string; category: HabitCategory; why: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <section className="border border-success bg-surface p-5">
        <p className="font-body text-sm text-success">Added — nice. It&apos;s on your list now.</p>
      </section>
    );
  }

  return (
    <section className="border border-hairline bg-surface p-5">
      <p className="font-label text-xs uppercase tracking-wide text-ink/50">Ready for your next habit?</p>
      <div className="mt-2 flex items-center gap-2">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_DOT[category] }} />
        <p className="font-body text-lg text-ink">{name}</p>
      </div>
      <p className="mt-1 font-body text-sm text-ink/60">{why}</p>
      {error ? <p role="alert" className="mt-2 font-body text-sm text-red">{error}</p> : null}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await adoptSuggestedHabitAction(name, category, why);
              if (res.error) setError(res.error);
              else {
                setDone(true);
                router.refresh();
              }
            })
          }
          className="min-h-tap bg-red px-4 py-2 font-label text-xs font-600 uppercase tracking-wide text-white hover:bg-red-ink disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add this habit"}
        </button>
        <span className="font-body text-xs text-ink/40">Only suggested once your current habits are sticking.</span>
      </div>
    </section>
  );
}
