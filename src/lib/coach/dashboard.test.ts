import { describe, expect, it } from "vitest";
import {
  reconcileLayout,
  moveTile,
  toggleTile,
  visibleTiles,
  DEFAULT_LAYOUT,
  DASHBOARD_TILES,
} from "@/lib/coach/dashboard";

describe("coach dashboard layout", () => {
  it("defaults to the full registry when nothing is stored", () => {
    expect(reconcileLayout(null).map((t) => t.id)).toEqual(DASHBOARD_TILES.map((t) => t.id));
    expect(reconcileLayout("garbage")).toEqual(DEFAULT_LAYOUT);
    expect(reconcileLayout([])).toEqual(DEFAULT_LAYOUT);
  });

  it("keeps stored order and visibility for known tiles", () => {
    const stored = [
      { id: "steady", visible: false },
      { id: "needs_attention", visible: true },
    ];
    const layout = reconcileLayout(stored);
    expect(layout[0]).toEqual({ id: "steady", visible: false });
    expect(layout[1]).toEqual({ id: "needs_attention", visible: true });
  });

  it("drops unknown ids and appends never-seen tiles at their defaults", () => {
    const layout = reconcileLayout([{ id: "bogus", visible: true }, { id: "steady", visible: false }]);
    expect(layout.some((t) => t.id === "bogus")).toBe(false);
    // steady kept first (from stored), the rest appended in registry order.
    expect(layout[0].id).toBe("steady");
    const appended = layout.slice(1).map((t) => t.id);
    expect(appended).toContain("snapshot");
    expect(appended).toContain("roster_trends");
    // roster_trends keeps its default-hidden state.
    expect(layout.find((t) => t.id === "roster_trends")?.visible).toBe(false);
  });

  it("ignores duplicate stored ids", () => {
    const layout = reconcileLayout([{ id: "steady", visible: true }, { id: "steady", visible: false }]);
    expect(layout.filter((t) => t.id === "steady")).toHaveLength(1);
    expect(layout.find((t) => t.id === "steady")?.visible).toBe(true);
  });

  it("moves a tile up and down within bounds", () => {
    const base = reconcileLayout([{ id: "snapshot", visible: true }, { id: "steady", visible: true }]);
    const down = moveTile(base, "snapshot", 1);
    expect(down[0].id).toBe("steady");
    expect(down[1].id).toBe("snapshot");
    // Moving the first tile up is a no-op.
    expect(moveTile(base, base[0].id, -1)).toBe(base);
    // Moving the last tile down is a no-op.
    expect(moveTile(base, base[base.length - 1].id, 1)).toBe(base);
  });

  it("toggles visibility without touching order", () => {
    const toggled = toggleTile(DEFAULT_LAYOUT, "steady");
    expect(toggled.find((t) => t.id === "steady")?.visible).toBe(false);
    expect(toggled.map((t) => t.id)).toEqual(DEFAULT_LAYOUT.map((t) => t.id));
  });

  it("visibleTiles returns only visible ids in order", () => {
    const layout = [
      { id: "steady", visible: false },
      { id: "snapshot", visible: true },
      { id: "coach_code", visible: true },
    ];
    expect(visibleTiles(layout)).toEqual(["snapshot", "coach_code"]);
  });
});
