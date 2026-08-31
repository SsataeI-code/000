"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { relogFoodAction } from "@/lib/food/actions";
import type { RelogFood } from "@/lib/nutrition/data";

/**
 * "Quick log" — the client's usual foods as one-tap chips (§2 low-friction; the
 * fastest path through the daily loop, since most people eat the same handful of
 * meals). Each tap re-logs the same thing and pops a little "+XP" reward so
 * logging feels like a game, not a chore.
 */
export function RecentFoods({ foods }: { foods: RelogFood[] }) {
  if (foods.length === 0) return null;
  return (
    <section aria-label="Quick log your usuals" className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-5 shadow-card">
      <div>
        <h2 className="text-2xl text-ink">Quick log</h2>
        <p className="mt-0.5 font-body text-sm text-ink/60">Your usuals — one tap, no typing.</p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {foods.map((f) => (
          <RecentChip key={f.name} food={f} />
        ))}
      </ul>
    </section>
  );
}

function RecentChip({ food }: { food: RelogFood }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [burst, setBurst] = useState(false);

  function add() {
    if (done || pending) return;
    setDone(true);
    setBurst(true);
    window.setTimeout(() => setBurst(false), 1100);
    start(async () => {
      await relogFoodAction({
        name: food.name,
        grams: food.grams,
        calories: food.calories,
        proteinG: food.proteinG,
        carbsG: food.carbsG,
        fatG: food.fatG,
        nutriments: food.nutriments,
      });
      router.refresh();
    });
  }

  return (
    <li className="relative">
      {burst ? (
        <span aria-hidden className="animate-xp-burst pointer-events-none absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-grad-success px-2 py-0.5 font-label text-[10px] font-600 uppercase tracking-wide text-white shadow-glow-success">
          Logged +15 XP
        </span>
      ) : null}
      <button
        type="button"
        onClick={add}
        disabled={pending || done}
        aria-label={`Log ${food.name} again`}
        className={`inline-flex min-h-tap items-center gap-2 rounded-full border px-3.5 py-2 font-body text-sm transition-transform active:scale-95 disabled:opacity-70 ${
          done
            ? "border-success/60 bg-success/15 text-success"
            : "border-hairline bg-surface-input text-ink hover:border-red hover:shadow-glow"
        }`}
      >
        <span aria-hidden className={`grid h-5 w-5 place-items-center rounded-full font-label text-[12px] font-600 ${done ? "bg-success text-white" : "bg-grad-red text-white"}`}>
          {done ? "✓" : "+"}
        </span>
        <span className="min-w-0 max-w-[10rem] truncate font-600">{food.name}</span>
        <span className="shrink-0 font-label text-[11px] uppercase tracking-wide text-ink/45">{food.calories} cal</span>
      </button>
    </li>
  );
}
