"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { relogFoodAction } from "@/lib/food/actions";
import type { RelogFood } from "@/lib/nutrition/data";

/**
 * "Log again" — the client's recent foods as chips, each one tap to re-log the
 * same thing. Most people eat the same handful of meals, so this is the fastest
 * path through the daily loop (§2 low-friction).
 */
export function RecentFoods({ foods }: { foods: RelogFood[] }) {
  if (foods.length === 0) return null;
  return (
    <section aria-label="Log again" className="flex flex-col gap-2 border border-hairline bg-surface p-5">
      <h2 className="text-2xl text-ink">Log again</h2>
      <p className="font-body text-sm text-ink/60">Your recent foods — one tap to log the same thing.</p>
      <ul className="mt-1 flex flex-wrap gap-2">
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

  function add() {
    setDone(true);
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
    <li>
      <button
        type="button"
        onClick={add}
        disabled={pending || done}
        aria-label={`Log ${food.name} again`}
        className="inline-flex min-h-tap items-center gap-2 border border-hairline bg-surface px-3 py-2 font-body text-sm text-ink hover:border-red disabled:opacity-50"
      >
        <span aria-hidden className="font-label text-[12px] font-600 uppercase text-red">{done ? "✓" : "+"}</span>
        <span className="min-w-0 truncate">{food.name}</span>
        <span className="shrink-0 font-body text-xs text-ink/40">{food.calories} cal</span>
      </button>
    </li>
  );
}
