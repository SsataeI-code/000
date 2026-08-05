"use client";

import { useActionState, useState } from "react";
import { archiveClientAction, deleteClientAction, type PlanState } from "@/lib/coach/actions";
import { Button } from "@/components/ui/Button";

const initial: PlanState = {};

/**
 * Remove a client from the roster. Archive (reversible, data kept per §13) uses a
 * two-step confirm; permanent delete (irreversible) requires typing DELETE and is
 * shown to whoever can manage this client (their coach or the owner). Both
 * redirect to the roster on success.
 */
export function RemoveClient({
  clientId,
  clientName,
  canDelete,
}: {
  clientId: string;
  clientName: string;
  canDelete: boolean;
}) {
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [aState, aAction, aPending] = useActionState(archiveClientAction.bind(null, clientId), initial);
  const [dState, dAction, dPending] = useActionState(deleteClientAction.bind(null, clientId), initial);

  return (
    <section aria-label={`Remove ${clientName}`} className="flex flex-col gap-4 border border-hairline bg-surface p-4">
      <div>
        <h2 className="text-2xl text-ink">Remove {clientName}</h2>
        <p className="mt-1 font-body text-sm text-ink/60">
          Archiving takes them off your roster, stats, and queues but keeps their history — you can bring them back later.
          {canDelete ? " Deleting erases their account and all their data for good." : ""}
        </p>
      </div>

      {/* Export first — §13, so no history is lost before removing */}
      <div className="flex flex-col gap-2">
        <a
          href={`/api/export/${clientId}`}
          className="min-h-tap self-start border border-hairline bg-surface px-4 py-2 font-label text-xs uppercase tracking-wide text-ink hover:border-red hover:text-red"
        >
          Export all data (JSON)
        </a>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-label text-[10px] uppercase tracking-wide text-ink/40">Or CSV:</span>
          {[
            { table: "food_logs", label: "Food" },
            { table: "habit_logs", label: "Habits" },
            { table: "body_measurements", label: "Body" },
            { table: "water_logs", label: "Water" },
          ].map((t) => (
            <a
              key={t.table}
              href={`/api/export/${clientId}?format=csv&table=${t.table}`}
              className="min-h-tap inline-flex items-center font-label text-xs uppercase tracking-wide text-ink/70 underline underline-offset-4 hover:text-red"
            >
              {t.label}
            </a>
          ))}
        </div>
      </div>

      {/* Archive — reversible */}
      <div className="flex flex-col gap-3">
        {aState.error ? (
          <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">{aState.error}</p>
        ) : null}
        {!confirmArchive ? (
          <button
            type="button"
            onClick={() => setConfirmArchive(true)}
            className="min-h-tap self-start border border-hairline bg-surface px-4 py-2 font-label text-xs uppercase tracking-wide text-ink hover:border-red hover:text-red"
          >
            Archive client
          </button>
        ) : (
          <form action={aAction} className="flex flex-wrap items-center gap-3">
            <span className="font-body text-sm text-ink">Archive {clientName}? They&apos;ll drop off your roster.</span>
            <Button type="submit" disabled={aPending}>{aPending ? "Archiving…" : "Yes, archive"}</Button>
            <button
              type="button"
              onClick={() => setConfirmArchive(false)}
              className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-ink"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* Permanent delete — irreversible */}
      {canDelete ? (
        <div className="mt-1 flex flex-col gap-2 border-t border-hairline pt-4">
          <p className="font-label text-xs uppercase tracking-wide text-red-ink">Danger zone — permanent</p>
          <p className="font-body text-sm text-ink/60">
            Permanently delete {clientName} and all their logs, habits, and messages. This cannot be undone.
          </p>
          {dState.error ? (
            <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">{dState.error}</p>
          ) : null}
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="min-h-tap self-start border border-red bg-surface px-4 py-2 font-label text-xs uppercase tracking-wide text-red-ink hover:bg-red hover:text-white"
            >
              Delete permanently
            </button>
          ) : (
            <form action={dAction} className="flex flex-wrap items-center gap-3">
              <span className="font-body text-sm text-ink">Delete {clientName} and all their data forever?</span>
              <button
                type="submit"
                disabled={dPending}
                className="min-h-tap bg-red px-5 py-2 font-label text-xs font-600 uppercase tracking-wide text-white hover:bg-red-ink disabled:opacity-50"
              >
                {dPending ? "Deleting…" : "Yes, delete forever"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-ink"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      ) : null}
    </section>
  );
}
