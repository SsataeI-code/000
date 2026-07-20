import type { RingSuggestion } from "@/lib/nutrition/recommend";

/**
 * "Ways to fill your rings" — food suggestions for whatever the client is still
 * short on today (protein, fiber, and the vitamins/minerals furthest from goal).
 * Real foods from the catalog with the amount each serving provides. Hidden when
 * the day is on track (nothing meaningful left to fill).
 */
export function FillYourRings({ suggestions }: { suggestions: RingSuggestion[] }) {
  if (suggestions.length === 0) return null;

  return (
    <section aria-label="Ways to fill your rings" className="border border-hairline bg-surface p-5">
      <p className="font-label text-xs uppercase tracking-wide text-red">Fill your rings</p>
      <div className="mt-3 flex flex-col gap-4">
        {suggestions.map((s) => (
          <div key={s.key}>
            <p className="font-label text-xs uppercase tracking-wide text-ink/60">{s.title}</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {s.foods.map((f) => (
                <li key={f.name} className="flex items-baseline justify-between gap-3">
                  <span className="font-body text-sm text-ink">{f.name}</span>
                  <span className="shrink-0 font-body text-xs text-ink/50">
                    {f.amount} · {f.grams}g
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
