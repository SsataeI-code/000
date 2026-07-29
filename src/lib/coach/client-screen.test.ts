import { describe, it, expect } from "vitest";
import {
  CLIENT_SECTIONS,
  DEFAULT_CLIENT_LAYOUT,
  reconcileClientLayout,
  moveSection,
  toggleSection,
  visibleSections,
  clientSectionDef,
} from "@/lib/coach/client-screen";

describe("client screen layout", () => {
  it("defaults to every section visible, in registry order", () => {
    expect(DEFAULT_CLIENT_LAYOUT.map((s) => s.id)).toEqual(CLIENT_SECTIONS.map((s) => s.id));
    expect(visibleSections(DEFAULT_CLIENT_LAYOUT)).toEqual(CLIENT_SECTIONS.map((s) => s.id));
  });

  it("reconciles empty/garbage to the full default layout", () => {
    expect(reconcileClientLayout(null)).toEqual(DEFAULT_CLIENT_LAYOUT);
    expect(reconcileClientLayout("nope")).toEqual(DEFAULT_CLIENT_LAYOUT);
    expect(reconcileClientLayout([{ id: "bogus", visible: true }])).toEqual(DEFAULT_CLIENT_LAYOUT);
  });

  it("keeps a stored order/visibility and appends unseen sections at the end", () => {
    const stored = [
      { id: "food", visible: true },
      { id: "habits", visible: false },
    ];
    const out = reconcileClientLayout(stored);
    expect(out[0]).toEqual({ id: "food", visible: true });
    expect(out[1]).toEqual({ id: "habits", visible: false });
    // The rest are appended at their defaults, none dropped or duplicated.
    expect(out.length).toBe(CLIENT_SECTIONS.length);
    expect(new Set(out.map((s) => s.id)).size).toBe(CLIENT_SECTIONS.length);
  });

  it("drops duplicates in stored data", () => {
    const out = reconcileClientLayout([
      { id: "water", visible: true },
      { id: "water", visible: false },
    ]);
    expect(out.filter((s) => s.id === "water")).toHaveLength(1);
    expect(out[0]).toEqual({ id: "water", visible: true });
  });

  it("moves a section up and down within bounds", () => {
    const l = DEFAULT_CLIENT_LAYOUT;
    expect(moveSection(l, l[0].id, -1)).toBe(l); // already first, no-op
    const moved = moveSection(l, l[1].id, -1);
    expect(moved[0].id).toBe(l[1].id);
    expect(moved[1].id).toBe(l[0].id);
    expect(moveSection(l, l[l.length - 1].id, 1)).toBe(l); // already last, no-op
  });

  it("toggles a section's visibility and hides it from the render list", () => {
    const hidden = toggleSection(DEFAULT_CLIENT_LAYOUT, "micros");
    expect(hidden.find((s) => s.id === "micros")?.visible).toBe(false);
    expect(visibleSections(hidden)).not.toContain("micros");
  });

  it("looks up section definitions", () => {
    expect(clientSectionDef("habits")?.label).toBe("Habits");
    expect(clientSectionDef("nope")).toBeUndefined();
  });
});
