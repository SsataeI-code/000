"use client";

import { useState, useTransition } from "react";
import { coachRecommendAction, coachSendRecommendationAction, type RecommendResult } from "@/lib/coach/recommend";
import type { MealSuggestion } from "@/lib/nutrition/meals";
import type { FoodPick } from "@/lib/nutrition/recommend";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

/**
 * Coach tool to recommend food/meals from the macros a client still needs
 * (§9 helping clients). Prefilled with what's left in the client's day; the
 * coach can tweak the numbers, get ideas that fit the client's diet, and send
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
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function getIdeas() {
    setError(null);
    setSent(null);
    start(async () => {
      const res = await coachRecommendAction(clientId, cals, protein);
      if (res.error) setError(res.error);
      setResult(res);
    });
  }

  function send(text: string, key: string) {
    setError(null);
    start(async () => {
      const res = await coachSendRecommendationAction(clientId, text);
      if (res.error) setError(res.error);
      else setSent(key);
    });
  }

  const first = clientName.split(" ")[0];

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface-muted shadow-card p-5">
      <div>
        <h2 className="text-2xl text-ink">Recommend a meal</h2>
        <p className="mt-1 font-body text-sm text-ink/60">Ideas that fit {first}&apos;s remaining macros and their diet. Tweak the numbers, then send one.</p>
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

          <p className="font-body text-xs text-ink/50">Send an idea as-is, or <strong className="text-ink/70">Edit</strong> it into the box below to tweak before sending.</p>

          {result.meals.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="font-label text-xs uppercase tracking-wide text-ink/50">Meals</p>
              {result.meals.map((m, i) => (
                <MealRow key={`m${i}`} m={m} sent={sent === `m${i}`} onSend={() => send(mealText(m, first), `m${i}`)} onEdit={() => setCustom(mealText(m, first))} />
              ))}
            </div>
          ) : null}

          {result.foods.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="font-label text-xs uppercase tracking-wide text-ink/50">Single foods</p>
              <div className="flex flex-col divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
                {result.foods.map((f, i) => (
                  <FoodRow key={`f${i}`} f={f} sent={sent === `f${i}`} onSend={() => send(foodText(f, first), `f${i}`)} onEdit={() => setCustom(foodText(f, first))} />
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
          onChange={(e) => setCustom(e.target.value)}
          placeholder={`e.g. Grill 6oz chicken + a cup of rice — hits your protein for dinner.`}
          className="min-h-tap w-full resize-none rounded-lg border border-hairline bg-surface-input px-3.5 py-2.5 font-body text-base text-ink placeholder:text-ink/40 outline-none focus:border-red focus:ring-2 focus:ring-red/30"
        />
        <Button type="button" onClick={() => { if (custom.trim()) { send(custom.trim(), "custom"); setCustom(""); } }} disabled={pending || !custom.trim()}>
          {sent === "custom" ? "Sent ✓" : "Send to " + first}
        </Button>
      </div>
    </section>
  );
}

function MealRow({ m, sent, onSend, onEdit }: { m: MealSuggestion; sent: boolean; onSend: () => void; onEdit: () => void }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-hairline bg-surface p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-body text-base font-600 text-ink">{m.name}</span>
        <span className="shrink-0 font-label text-[11px] uppercase tracking-wide text-ink/50">{m.calories} cal · {m.proteinG}g P</span>
      </div>
      <p className="font-body text-xs text-ink/55">{m.ingredients.join(" · ")}</p>
      {m.richIn.length > 0 ? <p className="font-body text-[11px] text-success">Rich in {m.richIn.join(", ")}</p> : null}
      <div className="mt-1 flex items-center gap-2">
        <button type="button" onClick={onSend} className="min-h-tap rounded-full bg-grad-red px-3.5 py-1.5 font-label text-[11px] font-600 uppercase tracking-wide text-white shadow-pop-red active:translate-y-[2px] active:shadow-none">
          {sent ? "Sent ✓" : "Send to client"}
        </button>
        <button type="button" onClick={onEdit} className="min-h-tap rounded-full border border-hairline px-3.5 py-1.5 font-label text-[11px] font-600 uppercase tracking-wide text-ink/70 hover:border-red hover:text-red">
          Edit
        </button>
      </div>
    </div>
  );
}

function FoodRow({ f, sent, onSend, onEdit }: { f: FoodPick; sent: boolean; onSend: () => void; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <span className="min-w-0">
        <span className="block truncate font-body text-sm text-ink">{f.name}</span>
        <span className="block font-body text-xs text-ink/50">{f.grams}g · {f.proteinG}g protein · {f.calories} cal</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onSend} className="min-h-tap rounded-full border border-red px-3 py-1.5 font-label text-[10px] font-600 uppercase tracking-wide text-red hover:bg-red hover:text-white">
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

function foodText(f: FoodPick, name: string): string {
  return `${name}, try ${f.name} (${f.grams}g) — ${f.proteinG}g protein for ${f.calories} cal. Good for hitting your target.`;
}
