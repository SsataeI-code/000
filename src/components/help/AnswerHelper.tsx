"use client";

import { useRef, useState } from "react";
import { answerQuestion, HELP_STARTERS, type HelpContext } from "@/lib/help/answer";

interface Turn {
  role: "user" | "helper";
  text: string;
}

/**
 * No-AI answer helper. Runs entirely in the browser off the client's own data
 * (passed as props) — instant, free, private, and it never makes up numbers.
 * Distinct from the coach chat (real people) and the AI assistant (needs a key).
 */
export function AnswerHelper({ ctx }: { ctx: HelpContext }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  function ask(text: string) {
    const q = text.trim();
    if (!q) return;
    setTurns((t) => [...t, { role: "user", text: q }, { role: "helper", text: answerQuestion(q, ctx) }]);
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "end" }));
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex max-h-[52vh] min-h-[7rem] flex-col gap-2 overflow-y-auto border border-hairline bg-surface p-4">
        {turns.length === 0 ? (
          <li className="flex flex-col gap-3 py-2">
            <p className="font-body text-sm text-ink/60">
              Quick answers from your own numbers — no waiting, always on. Tap one or type your own.
            </p>
            <div className="flex flex-col gap-2">
              {HELP_STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
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
                <p className="whitespace-pre-wrap break-words">{t.text}</p>
              </div>
            </li>
          ))
        )}
        <div ref={endRef} />
      </ol>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const el = e.currentTarget.elements.namedItem("hq") as HTMLInputElement;
          ask(el.value);
          el.value = "";
        }}
        className="flex items-end gap-2"
      >
        <label htmlFor="hq" className="sr-only">Ask a quick question</label>
        <input
          id="hq"
          name="hq"
          autoComplete="off"
          placeholder="Ask about calories, protein, water, habits…"
          className="min-h-tap flex-1 border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink placeholder:text-ink/40 focus:border-ink"
        />
        <button
          type="submit"
          className="min-h-tap shrink-0 bg-elevated px-4 py-2.5 font-label text-xs font-600 uppercase tracking-wide text-white hover:bg-red"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
