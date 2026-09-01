"use client";

import { useActionState, useState } from "react";
import { moveSection, toggleSection, clientSectionDef } from "@/lib/coach/client-screen";
import {
  saveClientScreenOverrideAction,
  resetClientScreenOverrideAction,
  type ClientScreenState,
} from "@/lib/coach/client-screen-actions";
import type { ClientSectionPref } from "@/lib/types/db";
import { Button } from "@/components/ui/Button";
import { ClientScreenPreview } from "@/components/coach/ClientScreenPreview";

const initialState: ClientScreenState = {};

/**
 * Per-client Today-screen editor (§4). Same move/toggle mechanics as the
 * roster-wide editor, but bound to ONE client: saving sets an override that wins
 * over the roster default; "Reset" clears it so they follow the default again.
 */
export function ClientScreenOverrideEditor({
  clientId,
  clientName,
  initial,
  overridden,
}: {
  clientId: string;
  clientName: string;
  initial: ClientSectionPref[];
  overridden: boolean;
}) {
  const [layout, setLayout] = useState<ClientSectionPref[]>(initial);
  const [dirty, setDirty] = useState(false);
  const [save, saveAction, saving] = useActionState(saveClientScreenOverrideAction, initialState);
  const [reset, resetAction, resetting] = useActionState(resetClientScreenOverrideAction, initialState);

  const update = (next: ClientSectionPref[]) => {
    setLayout(next);
    setDirty(true);
  };

  const anyError = save.error ?? reset.error;
  const allHidden = layout.every((s) => !s.visible);

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-sm text-ink/60">
        {overridden
          ? `${clientName} has a custom screen — it overrides your roster-wide default.`
          : `${clientName} currently follows your roster-wide default. Save here to give them a custom screen.`}
      </p>

      {anyError ? (
        <p role="alert" className="rounded-lg border border-red bg-surface px-3 py-2 text-sm text-red-ink">{anyError}</p>
      ) : null}
      {save.ok && !dirty ? (
        <p role="status" className="rounded-lg border border-success bg-surface px-3 py-2 text-sm text-success">
          Saved — {clientName}&apos;s screen now follows this custom order.
        </p>
      ) : null}
      {reset.reset ? (
        <p role="status" className="rounded-lg border border-success bg-surface px-3 py-2 text-sm text-success">
          Reset — {clientName} follows your roster-wide default again.
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[1fr_minmax(0,260px)] md:items-start">
      <ul className="flex flex-col divide-y divide-hairline rounded-2xl border border-hairline bg-surface shadow-card">
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

      {allHidden ? (
        <p className="font-body text-xs text-red-ink">
          Everything is hidden — turn at least one section on so {clientName}&apos;s screen isn&apos;t empty.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <form action={saveAction}>
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="layout" value={JSON.stringify(layout)} />
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save custom screen"}
          </Button>
        </form>

        {overridden ? (
          <form action={resetAction}>
            <input type="hidden" name="clientId" value={clientId} />
            <button
              type="submit"
              disabled={resetting}
              className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red disabled:opacity-50"
            >
              {resetting ? "Resetting…" : "Reset to roster default"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
