"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { createMealAction, logMealAction, searchFoodsAction } from "@/lib/food/actions";
import type { NormalizedFood } from "@/lib/food/off";
import type { MealItem } from "@/lib/types/db";

/**
 * Build a meal from ingredients (§5B). Search to add, tweak grams, remove, then
 * Save it as a reusable template and/or Log it now — one tap each. Can be
 * pre-filled from a suggestion to "customize" it.
 */
export function MealBuilder({
  initialName = "",
  initialItems = [],
}: {
  initialName?: string;
  initialItems?: MealItem[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [items, setItems] = useState<MealItem[]>(initialItems);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NormalizedFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [logging, startLog] = useTransition();
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const s = ++seq.current;
    const t = setTimeout(async () => {
      const found = await searchFoodsAction(q);
      if (s === seq.current) {
        setResults(found);
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  function addItem(f: NormalizedFood) {
    setItems((prev) => [
      ...prev,
      { name: f.name ?? "Food", grams: f.servingSizeG ?? 100, nutrimentsPer100g: f.nutrimentsPer100g },
    ]);
    setQuery("");
    setResults([]);
  }

  function setGrams(i: number, grams: number) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, grams } : it)));
  }
  function remove(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totals = items.reduce(
    (acc, it) => {
      const f = (Number(it.grams) || 0) / 100;
      const n = it.nutrimentsPer100g;
      acc.calories += (n.energy_kcal ?? 0) * f;
      acc.protein += (n.proteins ?? 0) * f;
      acc.carbs += (n.carbohydrates ?? 0) * f;
      acc.fat += (n.fat ?? 0) * f;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  function save() {
    setMsg(null);
    startSave(async () => {
      const res = await createMealAction(name, items);
      if (res.error) return setMsg(res.error);
      setMsg("Saved to your meals.");
      router.refresh();
    });
  }
  function logNow() {
    setMsg(null);
    startLog(async () => {
      const res = await logMealAction(items);
      if (res.error) return setMsg(res.error);
      router.push("/client");
    });
  }

  return (
    <div className="flex flex-col gap-4 border border-hairline bg-surface p-5">
      <Field label="Meal name" name="meal_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My go-to breakfast" />

      {/* Ingredients */}
      {items.length > 0 ? (
        <ul className="flex flex-col divide-y divide-hairline border border-hairline">
          {items.map((it, i) => (
            <li key={`${it.name}-${i}`} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-body text-sm text-ink">{it.name}</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label={`Grams of ${it.name}`}
                value={it.grams}
                onChange={(e) => setGrams(i, Number(e.target.value))}
                className="min-h-tap w-20 border border-hairline bg-surface px-2 py-1 text-right font-body text-sm"
              />
              <span className="font-body text-xs text-ink/50">g</span>
              <button
                type="button"
                aria-label={`Remove ${it.name}`}
                onClick={() => remove(i)}
                className="min-h-tap min-w-tap font-label text-xs uppercase tracking-wide text-ink/40 hover:text-red"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-body text-sm text-ink/60">Add ingredients to build your meal.</p>
      )}

      {items.length > 0 ? (
        <p className="font-body text-xs text-ink/60">
          ≈{Math.round(totals.calories)} cal · {Math.round(totals.protein)}g protein ·{" "}
          {Math.round(totals.carbs)}g carbs · {Math.round(totals.fat)}g fat
        </p>
      ) : null}

      {/* Add ingredient search */}
      <Field
        label="Add an ingredient"
        name="ingredient_q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search foods…"
        autoComplete="off"
      />
      {searching ? <p className="font-body text-xs text-ink/50">Searching…</p> : null}
      {results.length > 0 ? (
        <ul className="flex flex-col divide-y divide-hairline border border-hairline">
          {results.slice(0, 8).map((r, i) => (
            <li key={`${r.barcode}-${i}`}>
              <button
                type="button"
                onClick={() => addItem(r)}
                className="flex w-full min-h-tap items-center justify-between px-3 py-2 text-left hover:bg-surface-muted"
              >
                <span className="font-body text-sm text-ink">{r.name}</span>
                <span className="font-body text-xs text-ink/40">
                  {r.per100g.calories != null ? `${Math.round(r.per100g.calories)} kcal/100g` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {msg ? <p className="font-body text-sm text-ink/70">{msg}</p> : null}

      <div className="flex gap-3">
        <Button onClick={save} disabled={saving || items.length === 0}>
          {saving ? "Saving…" : "Save meal"}
        </Button>
        <Button variant="ghost" onClick={logNow} disabled={logging || items.length === 0}>
          {logging ? "Logging…" : "Log now"}
        </Button>
      </div>
    </div>
  );
}
