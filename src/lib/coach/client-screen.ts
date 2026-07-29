import type { ClientSectionPref } from "@/lib/types/db";

/**
 * Coach-configurable client "Today" screen (§4 coach-editable everything; §9
 * open-ended layouts, applied to the client side). Pure and tested: a canonical
 * registry of Today sections plus reconcile / move / toggle so a stored layout
 * survives new sections being added later and never trusts raw JSON blindly.
 *
 * The greeting and review banners are structural and always render — only the
 * sections below are arrangeable.
 */

export type ClientSectionId =
  | "habits"
  | "rings"
  | "water"
  | "ask"
  | "food"
  | "fill_rings"
  | "meals"
  | "micros";

export interface ClientSectionDef {
  id: ClientSectionId;
  label: string;
  description: string;
  defaultVisible: boolean;
}

/** Canonical sections, in their default order. New sections appended here just work. */
export const CLIENT_SECTIONS: ClientSectionDef[] = [
  { id: "habits", label: "Habits", description: "Today's habits to check off, with streak & level — the star of the screen.", defaultVisible: true },
  { id: "rings", label: "Progress rings", description: "Calories and macros filling up as they log.", defaultVisible: true },
  { id: "water", label: "Water", description: "The daily hydration ring with one-tap add.", defaultVisible: true },
  { id: "ask", label: "Ask helper", description: "A shortcut card to the instant answer helper.", defaultVisible: true },
  { id: "food", label: "Food log", description: "Add food and the day's logged items.", defaultVisible: true },
  { id: "fill_rings", label: "Fill your rings", description: "Smart suggestions for what's still short today.", defaultVisible: true },
  { id: "meals", label: "Meal ideas", description: "Saved meals and meal suggestions.", defaultVisible: true },
  { id: "micros", label: "Micronutrients", description: "The vitamins & minerals tracker.", defaultVisible: true },
];

const SECTION_IDS = new Set(CLIENT_SECTIONS.map((s) => s.id));
const isSectionId = (v: unknown): v is ClientSectionId =>
  typeof v === "string" && SECTION_IDS.has(v as ClientSectionId);

export const DEFAULT_CLIENT_LAYOUT: ClientSectionPref[] = CLIENT_SECTIONS.map((s) => ({
  id: s.id,
  visible: s.defaultVisible,
}));

/**
 * Turn whatever was stored (possibly stale or malformed) into a valid layout:
 * keep the coach's saved order/visibility for known sections, drop unknown ids,
 * and append any registry sections they've never seen (at their default state).
 */
export function reconcileClientLayout(stored: unknown): ClientSectionPref[] {
  const seen = new Set<ClientSectionId>();
  const out: ClientSectionPref[] = [];
  if (Array.isArray(stored)) {
    for (const entry of stored) {
      const id = (entry as { id?: unknown })?.id;
      if (!isSectionId(id) || seen.has(id)) continue;
      seen.add(id);
      out.push({ id, visible: Boolean((entry as { visible?: unknown }).visible) });
    }
  }
  for (const s of CLIENT_SECTIONS) {
    if (!seen.has(s.id)) out.push({ id: s.id, visible: s.defaultVisible });
  }
  return out;
}

/** The section definition for an id (registry lookup). */
export function clientSectionDef(id: string): ClientSectionDef | undefined {
  return CLIENT_SECTIONS.find((s) => s.id === id);
}

/** Move a section one slot up (-1) or down (+1); returns a new layout. */
export function moveSection(layout: ClientSectionPref[], id: string, dir: -1 | 1): ClientSectionPref[] {
  const i = layout.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= layout.length) return layout;
  const next = layout.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Flip a section's visibility; returns a new layout. */
export function toggleSection(layout: ClientSectionPref[], id: string): ClientSectionPref[] {
  return layout.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s));
}

/** Visible sections, in order — what the Today screen actually renders. */
export function visibleSections(layout: ClientSectionPref[]): ClientSectionId[] {
  return layout.filter((s) => s.visible).map((s) => s.id as ClientSectionId);
}
