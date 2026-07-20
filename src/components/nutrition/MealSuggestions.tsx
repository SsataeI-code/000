"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logMealAction } from "@/lib/food/actions";
import { MealBuilder } from "@/components/nutrition/MealBuilder";
import type { MealSuggestion } from "@/lib/nutrition/meals";

/**
 * "Meals to fill your rings" — a couple of balanced combinations matched to
 * what's still short today, each loggable in one tap. Easy to follow: see the
 * ingredients, see what it gives you, tap "Log meal".
 */
export function MealSuggestions({ meals }: { meals: MealSuggestion[] }) {
  if (meals.length === 0) return null;
  return (
    <section aria-label="Meal ideas" className="flex flex-col gap-3">
      <h2 className="text-2xl text-ink">Meal ideas</h2>
      {meals.map((meal) => (
        <MealCard key={meal.name} meal={meal} />
      ))}
    </section>
  );
}

function MealCard({ meal }: { meal: MealSuggestion }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [logged, setLogged] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function logIt() {
    setError(null);
    start(async () => {
      const res = await logMealAction(meal.items);
      if (res.error) {
        setError(res.error);
        return;
      }
      setLogged(true);
      router.refresh();
    });
  }

  return (
    <div className="border border-hairline bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xl text-ink">{meal.name}</h3>
        <span className="shrink-0 font-label text-[10px] uppercase tracking-wide text-ink/40">
          {meal.kind}
        </span>
      </div>

      <ul className="mt-2 flex flex-col gap-0.5">
        {meal.ingredients.map((line) => (
          <li key={line} className="font-body text-sm text-ink/70">
            {line}
          </li>
        ))}
      </ul>

      <p className="mt-3 font-body text-xs text-ink/60">
        ≈{meal.calories} cal · {meal.proteinG}g protein · {meal.fiberG}g fiber
        {meal.richIn.length ? ` · rich in ${meal.richIn.join(", ")}` : ""}
      </p>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-ink">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-4">
        <button
          type="button"
          onClick={logIt}
          disabled={pending || logged}
          className="inline-flex min-h-tap items-center justify-center bg-red px-5 py-2.5 font-label text-xs font-600 uppercase tracking-wide text-surface hover:bg-red-ink disabled:opacity-50"
        >
          {logged ? "Logged ✓" : pending ? "Logging…" : "Log this meal"}
        </button>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
          className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red"
        >
          {editing ? "Close" : "Customize"}
        </button>
      </div>

      {editing ? (
        <div className="mt-4">
          <p className="mb-2 font-body text-xs text-ink/50">
            Tweak the amounts, swap or add ingredients, then log or save it as your own.
          </p>
          <MealBuilder initialName={meal.name} initialItems={meal.items} />
        </div>
      ) : null}
    </div>
  );
}
