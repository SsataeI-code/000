/**
 * Per-client nutrition strictness (§B — coach-controlled): how tightly the app
 * holds the client to their macro targets. Pure and tested. Dials the client's
 * Today screen from exact macros all the way down to habits-only (no targets).
 */

export type Strictness = "precise" | "protein_cals" | "flexible" | "habits_only";

export const STRICTNESS_OPTIONS: { value: Strictness; label: string; help: string }[] = [
  { value: "precise", label: "Precise macros", help: "Exact calorie & macro targets." },
  { value: "protein_cals", label: "Protein & calories", help: "Hit protein and calories; carbs & fat stay flexible." },
  { value: "flexible", label: "Flexible ranges", help: "Targets shown as ranges, not exact numbers." },
  { value: "habits_only", label: "Habits only", help: "No macro targets — focus on habits." },
];

const VALUES = new Set(STRICTNESS_OPTIONS.map((o) => o.value));

export function isStrictness(v: unknown): v is Strictness {
  return typeof v === "string" && VALUES.has(v as Strictness);
}

export function strictnessLabel(v: Strictness): string {
  return STRICTNESS_OPTIONS.find((o) => o.value === v)?.label ?? "Precise macros";
}

/** Whether macro rings/targets show at all (everything except habits-only). */
export function showsMacros(v: Strictness): boolean {
  return v !== "habits_only";
}

/** A ± range around a target for the "flexible" mode. */
export function macroRange(target: number, pct = 0.1): { low: number; high: number } {
  if (!Number.isFinite(target) || target <= 0) return { low: 0, high: 0 };
  const d = Math.round(target * pct);
  return { low: Math.max(0, target - d), high: target + d };
}
