"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMealAction, logMealAction } from "@/lib/food/actions";
import type { Meal } from "@/lib/types/db";

/** The client's saved meals — one tap to log the whole thing, or delete it. */
export function SavedMealsList({ meals, showDelete = true }: { meals: Meal[]; showDelete?: boolean }) {
  if (meals.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {meals.map((meal) => (
        <SavedMealCard key={meal.id} meal={meal} showDelete={showDelete} />
      ))}
    </div>
  );
}

function mealCalories(meal: Meal): number {
  return Math.round(
    meal.items.reduce((sum, it) => sum + (it.nutrimentsPer100g?.energy_kcal ?? 0) * ((Number(it.grams) || 0) / 100), 0),
  );
}

function SavedMealCard({ meal, showDelete }: { meal: Meal; showDelete: boolean }) {
  const router = useRouter();
  const [logging, startLog] = useTransition();
  const [removing, startRemove] = useTransition();
  const [logged, setLogged] = useState(false);

  return (
    <div className="border border-hairline bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg text-ink">{meal.name}</h3>
        <span className="shrink-0 font-body text-xs text-ink/50">≈{mealCalories(meal)} cal</span>
      </div>
      <p className="mt-1 font-body text-xs text-ink/50">
        {meal.items.map((it) => it.name).join(", ")}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            startLog(async () => {
              const res = await logMealAction(meal.items);
              if (!res.error) {
                setLogged(true);
                router.refresh();
              }
            })
          }
          disabled={logging || logged}
          className="inline-flex min-h-tap items-center bg-red px-4 py-2 font-label text-xs font-600 uppercase tracking-wide text-surface hover:bg-red-ink disabled:opacity-50"
        >
          {logged ? "Logged ✓" : logging ? "Logging…" : "Log meal"}
        </button>
        {showDelete ? (
          <button
            type="button"
            onClick={() => startRemove(() => deleteMealAction(meal.id))}
            disabled={removing}
            className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/40 hover:text-red"
          >
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}
