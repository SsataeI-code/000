"use client";

import { useTransition } from "react";
import { deleteFoodLogAction } from "@/lib/food/actions";
import type { FoodLog } from "@/lib/types/db";

/** Today's logged items, newest first, each removable (undo a mistake). */
export function FoodLogList({ logs }: { logs: FoodLog[] }) {
  if (logs.length === 0) {
    return (
      <p className="border border-hairline bg-surface p-5 font-body text-sm text-ink/60">
        Nothing logged yet today. Scan a barcode or add something below.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-hairline border border-hairline bg-surface">
      {logs.map((log) => (
        <FoodLogRow key={log.id} log={log} />
      ))}
    </ul>
  );
}

function FoodLogRow({ log }: { log: FoodLog }) {
  const [pending, start] = useTransition();

  return (
    <li className={`flex items-center justify-between gap-3 px-4 py-3 ${pending ? "opacity-50" : ""}`}>
      <div className="min-w-0">
        <p className="truncate font-body text-sm font-500 text-ink">{log.name}</p>
        <p className="font-body text-xs text-ink/50">
          {log.calories} kcal · P{Math.round(Number(log.protein_g))} C{Math.round(Number(log.carbs_g))} F
          {Math.round(Number(log.fat_g))}
          {log.brand ? ` · ${log.brand}` : ""}
        </p>
      </div>
      <button
        type="button"
        aria-label={`Remove ${log.name}`}
        disabled={pending}
        onClick={() => start(() => deleteFoodLogAction(log.id))}
        className="min-h-tap min-w-tap shrink-0 font-label text-xs uppercase tracking-wide text-ink/40 hover:text-red"
      >
        Remove
      </button>
    </li>
  );
}
