"use client";

import { useActionState, useState } from "react";
import { moveSection, toggleSection, clientSectionDef } from "@/lib/coach/client-screen";
import { saveClientScreenLayoutAction, type ClientScreenState } from "@/lib/coach/client-screen-actions";
import type { ClientSectionPref } from "@/lib/types/db";
import { Button } from "@/components/ui/Button";
import { ClientScreenPreview } from "@/components/coach/ClientScreenPreview";

const initialState: ClientScreenState = {};

/**
 * Editor for the client "Today" screen (§4). Reorder sections with up/down,
 * show/hide with a toggle — pure list ops locally, then one save applies the
 * layout to every one of this coach's clients.
 */
export function ClientScreenEditor({ initial }: { initial: ClientSectionPref[] }) {
  const [layout, setLayout] = useState<ClientSectionPref[]>(initial);
  const [dirty, setDirty] = useState(false);
  const [state, formAction, pending] = useActionState(saveClientScreenLayoutAction, initialState);

  const update = (next: ClientSectionPref[]) => {
    setLayout(next);
    setDirty(true);
  };

  const hiddenCount = layout.filter((s) => !s.visible).length;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="layout" value={JSON.stringify(layout)} />

      {state.error ? (
        <p role="alert" className="rounded-lg border border-red bg-surface px-3 py-2 text-sm text-red-ink">{state.error}</p>
      ) : null}
      {state.ok && !dirty ? (
        <p role="status" className="rounded-lg border border-success bg-surface px-3 py-2 text-sm text-success">
          Saved — every client&apos;s Today screen now follows this order.
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[1fr_minmax(0,260px)] md:items-start">
      <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline bg-surface">
        {layout.map((s, i) => {
          const def = clientSectionDef(s.id);
          return (
            <li key={s.id} className="flex items-center gap-3 px-3 py-3">
              <div className="flex flex-col">
                <button
                  type="button"
                  aria-label={`Move ${def?.label ?? s.id} up`}
                  disabled={i === 0}
                  onClick={() => update(moveSection(layout, s.id, -1))}
                  className="min-h-[22px] px-1 font-body text-ink/60 disabled:opacity-25 hover:text-red"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={`Move ${def?.label ?? s.id} down`}
                  disabled={i === layout.length - 1}
                  onClick={() => update(moveSection(layout, s.id, 1))}
                  className="min-h-[22px] px-1 font-body text-ink/60 disabled:opacity-25 hover:text-red"
                >
                  ▼
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <p className={`font-body text-base ${s.visible ? "text-ink" : "text-ink/40"}`}>{def?.label ?? s.id}</p>
                {def ? <p className="font-body text-xs text-ink/50">{def.description}</p> : null}
              </div>

              <label className="flex shrink-0 cursor-pointer items-center gap-2 font-label text-[10px] uppercase tracking-wide text-ink/60">
                <input
                  type="checkbox"
                  checked={s.visible}
                  onChange={() => update(toggleSection(layout, s.id))}
                  className="h-4 w-4 accent-red"
                />
                Show
              </label>
            </li>
          );
        })}
      </ul>

      <div className="md:sticky md:top-4">
        <ClientScreenPreview layout={layout} />
      </div>
      </div>

      {hiddenCount === layout.length ? (
        <p className="font-body text-xs text-red-ink">
          Everything is hidden — turn at least one section on so the screen isn&apos;t empty.
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save client screen"}
      </Button>
    </form>
  );
}
