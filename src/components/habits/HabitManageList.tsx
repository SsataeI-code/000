"use client";

import { useTransition } from "react";
import { deleteHabitAction } from "@/lib/habits/actions";

export interface ManageItem {
  id: string;
  name: string;
  cadenceLabel: string;
  streak: number;
  consistencyPct: number;
}

/** Manage saved habits — see streak + consistency, archive one. */
export function HabitManageList({ items }: { items: ManageItem[] }) {
  if (items.length === 0) {
    return <p className="font-body text-sm text-ink/60">No habits yet. Create your first below.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-hairline border border-hairline bg-surface">
      {items.map((it) => (
        <Row key={it.id} item={it} />
      ))}
    </ul>
  );
}

function Row({ item }: { item: ManageItem }) {
  const [pending, start] = useTransition();
  return (
    <li className={`flex items-center justify-between gap-3 px-4 py-3 ${pending ? "opacity-50" : ""}`}>
      <div className="min-w-0">
        <p className="truncate font-body text-base text-ink">{item.name}</p>
        <p className="font-body text-xs text-ink/50">
          {item.cadenceLabel} · {item.streak}d streak · {item.consistencyPct}% consistent
        </p>
      </div>
      <button
        type="button"
        onClick={() => start(() => deleteHabitAction(item.id))}
        disabled={pending}
        className="min-h-tap shrink-0 font-label text-xs uppercase tracking-wide text-ink/40 hover:text-red"
      >
        Archive
      </button>
    </li>
  );
}
