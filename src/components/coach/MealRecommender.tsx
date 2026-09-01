"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { coachRecommendAction, coachSendRecommendationAction, type RecommendResult } from "@/lib/coach/recommend";
import { searchFoodsAction } from "@/lib/food/actions";
import type { NormalizedFood } from "@/lib/food/off";
import type { MealSuggestion, MealLogItem } from "@/lib/nutrition/meals";
import type { FoodPick } from "@/lib/nutrition/recommend";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

/** A food search result → a meal ingredient (ensuring macros are present). */
function toItem(f: NormalizedFood): MealLogItem {
  const per100 = { ...f.nutrimentsPer100g };
  if (per100.energy_kcal == null && f.per100g.calories != null) per100.energy_kcal = f.per100g.calories;
  if (per100.proteins == null && f.per100g.proteinG != null) per100.proteins = f.per100g.proteinG;
  return { name: f.name ?? "Food", grams: f.servingSizeG ?? 100, nutrimentsPer100g: per100 };
}

/**
 * Coach tool to recommend food/meals from the macros a client still needs
 * (§9 helping clients). Prefilled with what's left in the client's day; the
 * coach can tweak the numbers, get ideas that fit the client's diet, CUSTOMIZE
 * a meal (adjust amounts, drop ingredients — totals recompute live), and send
 * any of them — or write their own — straight to the client's chat.
 */
export function MealRecommender({
  clientId,
  clientName,
  remainingCalories,
  remainingProtein,
}: {
  clientId: string;
  clientName: string;
  remainingCalories: number;
  remainingProtein: number;
}) {
  const [cals, setCals] = useState(Math.max(0, Math.round(remainingCalories)));
  const [protein, setProtein] = useState(Math.max(0, Math.round(remainingProtein)));
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [pending, start] = useTransition();
  const [custom, setCustom] = useState("");
  const [customSent, setCustomSent] = useState(false);
  const [customPending, startCustom] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const first = clientName.split(" ")[0];

  function getIdeas() {
    setError(null);
    start(async () => {
      const res = await coachRecommendAction(clientId, cals, protein);
      if (res.error) setError(res.error);
      setResult(res);
    });
  }

  /** Shared send — returns whether it worked, so a row can show its own state. */
  async function send(text: string): Promise<boolean> {
    setError(null);
    const res = await coachSendRecommendationAction(clientId, text);
    if (res.error) {
      setError(res.error);
      return false;
    }
    return true;
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface-muted shadow-card p-5">
      <div>
        <h2 className="text-2xl text-ink">Recommend a meal</h2>
        <p className="mt-1 font-body text-sm text-ink/60">Ideas that fit {first}&apos;s remaining macros and their diet. Customize any meal, then send it.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Calories to fill" name="rec_cals" type="number" inputMode="numeric" min={0} value={cals} onChange={(e) => setCals(Math.max(0, Math.round(Number(e.target.value) || 0)))} />
        <Field label="Protein to fill (g)" name="rec_protein" type="number" inputMode="numeric" min={0} value={protein} onChange={(e) => setProtein(Math.max(0, Math.round(Number(e.target.value) || 0)))} />
      </div>
      <Button type="button" onClick={getIdeas} disabled={pending}>{pending ? "Finding…" : "Get ideas"}</Button>

      {error ? <p role="alert" className="rounded-lg border border-red bg-surface px-3 py-2 text-sm text-red-ink">{error}</p> : null}

      {result ? (
        <div className="flex flex-col gap-4">
          {result.meals.length === 0 && result.foods.length === 0 ? (
            <p className="font-body text-sm text-ink/60">No ideas fit those numbers — try loosening them.</p>
          ) : null}

          {result.meals.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="font-label text-xs uppercase tracking-wide text-ink/50">Meals — tap Customize to tweak</p>
              {result.meals.map((m, i) => (
                <MealRow key={`m${i}`} m={m} name={first} send={send} />
              ))}
            </div>
          ) : null}

          {result.foods.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="font-label text-xs uppercase tracking-wide text-ink/50">Single foods</p>
              <div className="flex flex-col divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
                {result.foods.map((f, i) => (
                  <FoodRow key={`f${i}`} f={f} name={first} send={send} onEdit={() => setCustom(foodText(f, first))} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Write your own */}
      <div className="flex flex-col gap-2 border-t border-hairline pt-4">
        <label htmlFor="rec_custom" className="font-label text-xs uppercase tracking-wide text-ink/50">Write or edit a recommendation</label>
        <textarea
          id="rec_custom"
          rows={2}
          value={custom}
          onChange={(e) => { setCustom(e.target.value); setCustomSent(false); }}
          placeholder="e.g. Grill 6oz chicken + a cup of rice — hits your protein for dinner."
          className="min-h-tap w-full resize-none rounded-lg border border-hairline bg-surface-input px-3.5 py-2.5 font-body text-base text-ink placeholder:text-ink/40 outline-none focus:border-red focus:ring-2 focus:ring-red/30"
        />
        <Button
          type="button"
          disabled={customPending || !custom.trim()}
          onClick={() => startCustom(async () => { if (await send(custom.trim())) { setCustomSent(true); setCustom(""); } })}
        >
          {customSent ? "Sent ✓" : customPending ? "Sending…" : `Send to ${first}`}
        </Button>
      </div>
    </section>
  );
}

function itemMacros(items: MealLogItem[]) {
  let calories = 0;
  let protein = 0;
  for (const it of items) {
    const f = (Number(it.grams) || 0) / 100;
    calories += (it.nutrimentsPer100g.energy_kcal ?? 0) * f;
    protein += (it.nutrimentsPer100g.proteins ?? 0) * f;
  }
  return { calories: Math.round(calories), protein: Math.round(protein) };
}

function MealRow({ m, name, send }: { m: MealSuggestion; name: string; send: (t: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MealLogItem[]>(m.items);
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const totals = itemMacros(items);

  // Ingredient search (add or swap).
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NormalizedFood[]>([]);
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const s = ++seq.current;
    const t = setTimeout(async () => {
      const found = await searchFoodsAction(q);
      if (s === seq.current) { setResults(found); setSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const setGrams = (i: number, g: number) => { setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, grams: Math.max(0, Math.round(g) || 0) } : it))); setSent(false); };
  const remove = (i: number) => { setItems((prev) => prev.filter((_, idx) => idx !== i)); setSent(false); };
  const addFood = (f: NormalizedFood) => { setItems((prev) => [...prev, toItem(f)]); setQuery(""); setResults([]); setSent(false); };

  function doSend(text: string) {
    start(async () => { if (await send(text)) setSent(true); });
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-hairline bg-surface p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-body text-base font-600 text-ink">{m.name}</span>
        <span className="shrink-0 font-label text-[11px] uppercase tracking-wide text-ink/50">{open ? totals.calories : m.calories} cal · {open ? totals.protein : m.proteinG}g P</span>
      </div>
      {!open ? <p className="font-body text-xs text-ink/55">{m.ingredients.join(" · ")}</p> : null}
      {m.richIn.length > 0 && !open ? <p className="font-body text-[11px] text-success">Rich in {m.richIn.join(", ")}</p> : null}

      {open ? (
        <div className="mt-1 flex flex-col divide-y divide-hairline rounded-xl border border-hairline bg-surface-input">
          {items.map((it, i) => (
            <div key={`${it.name}-${i}`} className="flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-body text-sm text-ink">{it.name}</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label={`Grams of ${it.name}`}
                value={it.grams}
                onChange={(e) => { setGrams(i, Number(e.target.value)); setSent(false); }}
                className="min-h-tap w-16 rounded-lg border border-hairline bg-surface px-2 py-1 text-right font-body text-sm text-ink"
              />
              <span className="font-body text-xs text-ink/50">g</span>
              <button type="button" aria-label={`Remove ${it.name}`} onClick={() => { remove(i); setSent(false); }} className="min-h-tap min-w-tap font-label text-xs text-ink/40 hover:text-red">✕</button>
            </div>
          ))}
          {items.length === 0 ? <p className="px-3 py-2 font-body text-xs text-ink/50">All ingredients removed — add one below.</p> : null}
        </div>
      ) : null}

      {open ? (
        <div className="mt-2 flex flex-col gap-1.5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add or swap an ingredient — search foods…"
            autoComplete="off"
            className="min-h-tap w-full rounded-lg border border-hairline bg-surface-input px-3 py-2 font-body text-sm text-ink placeholder:text-ink/40 outline-none focus:border-red focus:ring-2 focus:ring-red/30"
          />
          {searching ? <p className="font-body text-xs text-ink/50">Searching…</p> : null}
          {results.length > 0 ? (
            <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline bg-surface">
              {results.slice(0, 8).map((r, i) => (
                <li key={`${r.barcode}-${i}`}>
                  <button type="button" onClick={() => addFood(r)} className="flex w-full min-h-tap items-center justify-between gap-2 px-3 py-2 text-left hover:bg-surface-muted">
                    <span className="min-w-0 truncate font-body text-sm text-ink">{r.name}</span>
                    <span className="shrink-0 font-body text-xs text-ink/40">{r.per100g.calories != null ? `${Math.round(r.per100g.calories)} kcal/100g` : "add"}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-1 flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending || sent || (open && items.length === 0)} onClick={() => doSend(open ? customMealText(m.name, items, totals, name) : mealText(m, name))} className="min-h-tap rounded-full bg-grad-red px-3.5 py-1.5 font-label text-[11px] font-600 uppercase tracking-wide text-white shadow-pop-red active:translate-y-[2px] active:shadow-none disabled:opacity-60">
          {sent ? "Sent ✓" : pending ? "Sending…" : open ? "Send customized" : "Send to client"}
        </button>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="min-h-tap rounded-full border border-hairline px-3.5 py-1.5 font-label text-[11px] font-600 uppercase tracking-wide text-ink/70 hover:border-red hover:text-red">
          {open ? "Done" : "Customize"}
        </button>
      </div>
    </div>
  );
}

function FoodRow({ f, name, send, onEdit }: { f: FoodPick; name: string; send: (t: string) => Promise<boolean>; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <span className="min-w-0">
        <span className="block truncate font-body text-sm text-ink">{f.name}</span>
        <span className="block font-body text-xs text-ink/50">{f.grams}g · {f.proteinG}g protein · {f.calories} cal</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <button type="button" disabled={pending || sent} onClick={() => start(async () => { if (await send(foodText(f, name))) setSent(true); })} className="min-h-tap rounded-full border border-red px-3 py-1.5 font-label text-[10px] font-600 uppercase tracking-wide text-red hover:bg-red hover:text-white disabled:opacity-60">
          {sent ? "Sent ✓" : "Send"}
        </button>
        <button type="button" onClick={onEdit} className="min-h-tap rounded-full border border-hairline px-3 py-1.5 font-label text-[10px] font-600 uppercase tracking-wide text-ink/70 hover:border-red hover:text-red">
          Edit
        </button>
      </span>
    </div>
  );
}

function mealText(m: MealSuggestion, name: string): string {
  const rich = m.richIn.length > 0 ? `\nRich in ${m.richIn.join(", ")}.` : "";
  return `${name}, here's a meal idea: ${m.name} — about ${m.calories} cal and ${m.proteinG}g protein.\nIngredients: ${m.ingredients.join(", ")}.${rich}`;
}

function customMealText(mealName: string, items: MealLogItem[], totals: { calories: number; protein: number }, name: string): string {
  const lines = items.map((it) => `${it.name} · ${it.grams}g`).join(", ");
  return `${name}, here's a meal idea: ${mealName} — about ${totals.calories} cal and ${totals.protein}g protein.\nIngredients: ${lines}.`;
}

function foodText(f: FoodPick, name: string): string {
  return `${name}, try ${f.name} (${f.grams}g) — ${f.proteinG}g protein for ${f.calories} cal. Good for hitting your target.`;
}
