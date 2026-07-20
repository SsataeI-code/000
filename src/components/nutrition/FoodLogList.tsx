"use client";

import { useTransition } from "react";
import { deleteFoodLogAction } from "@/lib/food/actions";
import type { FoodLog } from "@/lib/types/db";

/** Today's logged items, newest first, each removable (undo a mistake). */
export function FoodLogList({ logs, photoUrls = {} }: { logs: FoodLog[]; photoUrls?: Record<string, string> }) {
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
        <FoodLogRow key={log.id} log={log} photoUrl={photoUrls[log.id]} />
      ))}
    </ul>
  );
}

function FoodLogRow({ log, photoUrl }: { log: FoodLog; photoUrl?: string }) {
  const [pending, start] = useTransition();

  return (
    <li className={`flex items-center justify-between gap-3 px-4 py-3 ${pending ? "opacity-50" : ""}`}>
      <div className="flex min-w-0 items-center gap-3">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-11 w-11 shrink-0 object-cover" />
        ) : null}
        <div className="min-w-0">
        <p className="truncate font-body text-sm font-500 text-ink">{log.name}</p>
        <p className="font-body text-xs text-ink/50">
          {log.calories} kcal · P{Math.round(Number(log.protein_g))} C{Math.round(Number(log.carbs_g))} F
          {Math.round(Number(log.fat_g))}
          {log.brand ? ` · ${log.brand}` : ""}
        </p>
        </div>
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
