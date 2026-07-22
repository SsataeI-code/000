"use client";

import { useActionState, useState } from "react";
import { moveTile, toggleTile, tileDef } from "@/lib/coach/dashboard";
import { saveDashboardLayoutAction, type DashboardState } from "@/lib/coach/dashboard-actions";
import type { DashboardTilePref } from "@/lib/types/db";
import { Button } from "@/components/ui/Button";

const initialState: DashboardState = {};

/**
 * Coach dashboard layout editor (§9). Reorder tiles with up/down, show/hide with
 * a toggle — pure list ops locally, then one save persists the whole layout.
 */
export function DashboardEditor({ initial }: { initial: DashboardTilePref[] }) {
  const [layout, setLayout] = useState<DashboardTilePref[]>(initial);
  const [dirty, setDirty] = useState(false);
  const [state, formAction, pending] = useActionState(saveDashboardLayoutAction, initialState);

  const update = (next: DashboardTilePref[]) => {
    setLayout(next);
    setDirty(true);
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="layout" value={JSON.stringify(layout)} />

      {state.error ? (
        <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">{state.error}</p>
      ) : null}
      {state.ok && !dirty ? (
        <p role="status" className="border border-success bg-surface px-3 py-2 text-sm text-success">Layout saved.</p>
      ) : null}

      <ul className="flex flex-col divide-y divide-hairline border border-hairline bg-surface">
        {layout.map((t, i) => {
          const def = tileDef(t.id);
          return (
            <li key={t.id} className="flex items-center gap-3 px-3 py-3">
              <div className="flex flex-col">
                <button
                  type="button"
                  aria-label={`Move ${def?.label ?? t.id} up`}
                  disabled={i === 0}
                  onClick={() => update(moveTile(layout, t.id, -1))}
                  className="min-h-[22px] px-1 font-body text-ink/60 disabled:opacity-25 hover:text-red"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={`Move ${def?.label ?? t.id} down`}
                  disabled={i === layout.length - 1}
                  onClick={() => update(moveTile(layout, t.id, 1))}
                  className="min-h-[22px] px-1 font-body text-ink/60 disabled:opacity-25 hover:text-red"
                >
                  ▼
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <p className={`font-body text-base ${t.visible ? "text-ink" : "text-ink/40"}`}>{def?.label ?? t.id}</p>
                {def ? <p className="font-body text-xs text-ink/50">{def.description}</p> : null}
              </div>

              <label className="flex shrink-0 cursor-pointer items-center gap-2 font-label text-[10px] uppercase tracking-wide text-ink/60">
                <input
                  type="checkbox"
                  checked={t.visible}
                  onChange={() => update(toggleTile(layout, t.id))}
                  className="h-4 w-4 accent-red"
                />
                Show
              </label>
            </li>
          );
        })}
      </ul>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save layout"}
      </Button>
    </form>
  );
}
