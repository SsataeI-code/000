"use client";

import { useRef, useState, useTransition } from "react";
import { askAssistantAction, type ChatTurn } from "@/lib/ai/actions";

const STARTERS = [
  "What should I eat to hit my protein?",
  "Give me a quick lunch idea within my calories.",
  "Swap a snack for something higher protein.",
];

/**
 * Client AI assistant chat (§11). Grounded in the client's real day server-side;
 * the guardrails live in the system prompt. Warm, low-friction, and honest —
 * anything medical or a plan change is steered to the coach by the model.
 */
export function Assistant() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    const next: ChatTurn[] = [...turns, { role: "user", content }];
    setTurns(next);
    setError(null);
    start(async () => {
      const res = await askAssistantAction(next);
      if (res.error) setError(res.error);
      else if (res.reply) setTurns((t) => [...t, { role: "assistant", content: res.reply! }]);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "end" }));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex max-h-[58vh] min-h-[8rem] flex-col gap-2 overflow-y-auto border border-hairline bg-surface p-4">
        {turns.length === 0 ? (
          <li className="flex flex-col gap-3 py-4">
            <p className="font-body text-sm text-ink/60">
              Ask me about meals, swaps, or hitting your targets today. I only know your real numbers — I&apos;ll never make them up, and anything medical goes to your coach.
            </p>
            <div className="flex flex-col gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="min-h-tap border border-hairline bg-surface px-3 py-2 text-left font-body text-sm text-ink hover:border-red"
                >
                  {s}
                </button>
              ))}
            </div>
          </li>
        ) : (
          turns.map((t, i) => (
            <li key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] border px-3 py-2 font-body text-sm ${
                  t.role === "user" ? "border-ink bg-elevated text-white" : "border-hairline bg-surface text-ink"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{t.content}</p>
              </div>
            </li>
          ))
        )}
        {pending ? (
          <li className="justify-start">
            <span className="font-label text-[11px] uppercase tracking-wide text-ink/40">Thinking…</span>
          </li>
        ) : null}
        <div ref={endRef} />
      </ol>

      {error ? <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">{error}</p> : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const el = e.currentTarget.elements.namedItem("q") as HTMLInputElement;
          send(el.value);
          el.value = "";
        }}
        className="flex items-end gap-2"
      >
        <label htmlFor="q" className="sr-only">Ask the assistant</label>
        <input
          id="q"
          name="q"
          autoComplete="off"
          placeholder="Ask about food, swaps, your targets…"
          className="min-h-tap flex-1 border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink placeholder:text-ink/40 focus:border-ink"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-tap shrink-0 bg-red px-4 py-2.5 font-label text-xs font-600 uppercase tracking-wide text-white hover:bg-red-ink disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
