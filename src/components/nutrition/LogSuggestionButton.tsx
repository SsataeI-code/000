"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logFoodAction } from "@/lib/food/actions";
import type { FoodPick } from "@/lib/nutrition/recommend";

/** One-tap log for a suggested food — saves the serving's macros/micros to today. */
export function LogSuggestionButton({ food }: { food: FoodPick }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  function add() {
    setDone(true);
    start(async () => {
      await logFoodAction({
        name: food.name,
        grams: food.grams,
        calories: food.calories,
        proteinG: food.proteinG,
        carbsG: food.carbsG,
        fatG: food.fatG,
        nutrimentsPer100g: food.per100g,
        source: "search",
      });
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={pending || done}
      aria-label={`Log ${food.name}`}
      className="min-h-tap shrink-0 rounded-lg border border-hairline bg-surface px-3 py-1 font-label text-[10px] uppercase tracking-wide text-ink hover:border-red hover:text-red disabled:opacity-50"
    >
      {done ? "Added" : "Add"}
    </button>
  );
}
