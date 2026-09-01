"use client";

import { visibleSections, clientSectionDef, type ClientSectionId } from "@/lib/coach/client-screen";
import type { ClientSectionPref } from "@/lib/types/db";

/**
 * A live, miniature phone preview of the client "Today" screen — updates as the
 * coach reorders / hides sections in the editor beside it. Purely illustrative
 * (schematic blocks, not the real widgets) so the coach can *see* the layout
 * they're building. The greeting + review banner are always shown (structural).
 */
export function ClientScreenPreview({ layout }: { layout: ClientSectionPref[] }) {
  const ids = visibleSections(layout);

  return (
    <div className="mx-auto w-full max-w-[260px]">
      <div className="rounded-[26px] border-2 border-hairline bg-surface-muted p-2 shadow-sm">
        {/* screen */}
        <div className="flex max-h-[440px] flex-col gap-2 overflow-hidden rounded-[18px] bg-surface p-3">
          {/* Always-on greeting */}
          <div>
            <div className="h-1.5 w-10 rounded bg-ink/20" />
            <div className="mt-1 h-3 w-28 rounded bg-ink/70" />
          </div>
          {/* Always-on review banner */}
          <div className="rounded rounded-lg border border-hairline bg-elevated px-2 py-1.5">
            <div className="h-1.5 w-24 rounded bg-ink/25" />
          </div>

          {ids.length === 0 ? (
            <p className="mt-2 font-body text-[10px] text-red-ink">
              Every section is hidden — clients would see only their greeting.
            </p>
          ) : (
            ids.map((id) => <PreviewBlock key={id} id={id} />)
          )}
        </div>
      </div>
      <p className="mt-2 text-center font-label text-[10px] uppercase tracking-wide text-ink/40">
        Live preview
      </p>
    </div>
  );
}

/** A schematic block standing in for one Today section. */
function PreviewBlock({ id }: { id: ClientSectionId }) {
  const label = clientSectionDef(id)?.label ?? id;
  return (
    <div className="rounded rounded-2xl border border-hairline bg-surface-muted/60 p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-label text-[9px] uppercase tracking-wide text-ink/50">{label}</span>
      </div>
      <Schematic id={id} />
    </div>
  );
}

const bar = "h-1.5 rounded bg-ink/20";
const dot = "h-5 w-5 rounded-full border-2 border-red/40";

function Schematic({ id }: { id: ClientSectionId }) {
  switch (id) {
    case "habits":
      return (
        <div className="flex flex-col gap-1.5">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm border border-red/50" />
              <span className={`${bar} w-20`} />
            </div>
          ))}
        </div>
      );
    case "rings":
      return (
        <div className="flex items-center gap-2">
          <span className={dot} />
          <span className={dot} />
          <span className={dot} />
        </div>
      );
    case "water":
      return <div className="h-3 w-full rounded-full bg-red/25" />;
    case "ask":
      return (
        <div className="flex items-center justify-between">
          <span className={`${bar} w-16`} />
          <span className="font-label text-[9px] uppercase tracking-wide text-red">Ask →</span>
        </div>
      );
    case "food":
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className={`${bar} w-10`} />
            <span className="rounded bg-red/70 px-2 py-0.5 text-[8px] font-600 uppercase text-white">Add</span>
          </div>
          <span className={`${bar} w-full`} />
        </div>
      );
    case "fill_rings":
      return (
        <div className="flex gap-1.5">
          <span className="h-3 w-12 rounded-full bg-ink/15" />
          <span className="h-3 w-10 rounded-full bg-ink/15" />
        </div>
      );
    case "meals":
      return (
        <div className="flex gap-1.5">
          <span className="h-6 flex-1 rounded border border-hairline" />
          <span className="h-6 flex-1 rounded border border-hairline" />
        </div>
      );
    case "micros":
      return (
        <div className="flex items-end gap-1">
          {[3, 5, 2, 4, 3].map((h, i) => (
            <span key={i} className="w-2 rounded-sm bg-ink/20" style={{ height: `${h * 2 + 4}px` }} />
          ))}
        </div>
      );
  }
}
