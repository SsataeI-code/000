"use client";

import { useActionState } from "react";
import { restoreClientAction, type PlanState } from "@/lib/coach/actions";
import type { ArchivedClient } from "@/lib/coach/data";

const initial: PlanState = {};

/** One archived-client row with a one-tap restore (reversible). */
function ArchivedRow({ client }: { client: ArchivedClient }) {
  const [state, action, pending] = useActionState(restoreClientAction.bind(null, client.clientId), initial);
  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-body text-base text-ink">{client.name}</p>
        {state.error ? (
          <p role="alert" className="mt-1 font-body text-xs text-red-ink">{state.error}</p>
        ) : null}
      </div>
      <form action={action}>
        <button
          type="submit"
          disabled={pending}
          className="min-h-tap rounded-2xl border border-hairline bg-surface shadow-card px-4 py-2 font-label text-xs uppercase tracking-wide text-ink hover:border-red hover:text-red disabled:opacity-50"
        >
          {pending ? "Restoring…" : "Restore"}
        </button>
      </form>
    </li>
  );
}

/** The archived-clients list — restore any of them back to the roster. */
export function ArchivedClients({ clients }: { clients: ArchivedClient[] }) {
  if (clients.length === 0) {
    return <p className="font-body text-sm text-ink/60">No archived clients. Anyone you archive shows up here to restore.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-hairline rounded-2xl border border-hairline bg-surface shadow-card">
      {clients.map((c) => (
        <ArchivedRow key={c.clientId} client={c} />
      ))}
    </ul>
  );
}
