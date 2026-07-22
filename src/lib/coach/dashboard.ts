import type { DashboardTilePref } from "@/lib/types/db";

/**
 * Coach dashboard tile model (§9 — "the dashboard is open-ended and editable …
 * the coach arranges, adds, and edits the tiles"). Pure and tested: a canonical
 * registry of tiles plus reconcile / move / toggle so a stored layout survives
 * new tiles being added later and never trusts raw JSON blindly.
 */

export type TileId = "snapshot" | "needs_attention" | "steady" | "roster_trends" | "coach_code";

export interface TileDef {
  id: TileId;
  label: string;
  description: string;
  defaultVisible: boolean;
}

/** Canonical tiles, in their default order. New tiles appended here just work. */
export const DASHBOARD_TILES: TileDef[] = [
  { id: "snapshot", label: "Snapshot", description: "Client count, active today, and how many need attention.", defaultVisible: true },
  { id: "needs_attention", label: "Needs attention", description: "Flagged clients, most urgent first.", defaultVisible: true },
  { id: "steady", label: "Steady", description: "Everyone who's on track right now.", defaultVisible: true },
  { id: "roster_trends", label: "Roster trends", description: "Whole-roster logging, calories, protein, and engagement graphs.", defaultVisible: false },
  { id: "coach_code", label: "Your coach code", description: "Share-your-code card for bringing new clients in.", defaultVisible: true },
];

const TILE_IDS = new Set(DASHBOARD_TILES.map((t) => t.id));
const isTileId = (v: unknown): v is TileId => typeof v === "string" && TILE_IDS.has(v as TileId);

export const DEFAULT_LAYOUT: DashboardTilePref[] = DASHBOARD_TILES.map((t) => ({ id: t.id, visible: t.defaultVisible }));

/**
 * Turn whatever was stored (possibly stale or malformed) into a valid layout:
 * keep the coach's saved order/visibility for known tiles, drop unknown ids,
 * and append any registry tiles they've never seen (at their default state).
 */
export function reconcileLayout(stored: unknown): DashboardTilePref[] {
  const seen = new Set<TileId>();
  const out: DashboardTilePref[] = [];
  if (Array.isArray(stored)) {
    for (const entry of stored) {
      const id = (entry as { id?: unknown })?.id;
      if (!isTileId(id) || seen.has(id)) continue;
      seen.add(id);
      out.push({ id, visible: Boolean((entry as { visible?: unknown }).visible) });
    }
  }
  for (const t of DASHBOARD_TILES) {
    if (!seen.has(t.id)) out.push({ id: t.id, visible: t.defaultVisible });
  }
  return out;
}

/** The tile definition for an id (registry lookup). */
export function tileDef(id: string): TileDef | undefined {
  return DASHBOARD_TILES.find((t) => t.id === id);
}

/** Move a tile one slot up (-1) or down (+1); returns a new layout. */
export function moveTile(layout: DashboardTilePref[], id: string, dir: -1 | 1): DashboardTilePref[] {
  const i = layout.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= layout.length) return layout;
  const next = layout.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Flip a tile's visibility; returns a new layout. */
export function toggleTile(layout: DashboardTilePref[], id: string): DashboardTilePref[] {
  return layout.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t));
}

/** Visible tiles, in order — what the dashboard actually renders. */
export function visibleTiles(layout: DashboardTilePref[]): TileId[] {
  return layout.filter((t) => t.visible).map((t) => t.id as TileId);
}
