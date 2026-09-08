/**
 * Portion options (§5B — many clients can't eyeball grams). Convert a friendly
 * amount (servings, ounces, cups, tablespoons, pieces, a handful) into grams so
 * the macro math still works. Volume/piece factors are deliberate approximations
 * (food density varies); servings and ounces are exact.
 */

export type PortionUnit = "serving" | "g" | "oz" | "cup" | "tbsp" | "tsp" | "piece" | "handful";

export const PORTION_OPTIONS: Array<{ unit: PortionUnit; label: string }> = [
  { unit: "serving", label: "servings" },
  { unit: "g", label: "grams" },
  { unit: "oz", label: "ounces" },
  { unit: "cup", label: "cups (~240g)" },
  { unit: "tbsp", label: "tbsp (~15g)" },
  { unit: "tsp", label: "tsp (~5g)" },
  { unit: "piece", label: "pieces / slices" },
  { unit: "handful", label: "handful (~30g)" },
];

const G_PER_OZ = 28.35;

/**
 * Natural count units for count-y foods (owner: let clients log "1 egg" or
 * "1 slice of toast" instead of grams). Pure. Returns a singular/plural noun
 * when a food is normally eaten as whole pieces; the per-piece grams come from
 * the food's own typical serving size, so "1 egg" logs the right weight/macros.
 * Prepared dishes (scrambled eggs, egg salad, French toast…) are excluded — a
 * "piece" doesn't mean anything there — so they keep grams/servings.
 */
const PIECE_RULES: { test: RegExp; one: string; many: string }[] = [
  { test: /\beggs?\b/i, one: "egg", many: "eggs" },
  { test: /\b(bread|toast)\b/i, one: "slice", many: "slices" },
  { test: /\bbacon\b/i, one: "slice", many: "slices" },
  { test: /\bbagel\b/i, one: "bagel", many: "bagels" },
  { test: /\b(roll|bun)\b/i, one: "roll", many: "rolls" },
  { test: /\b(tortilla|wrap)\b/i, one: "wrap", many: "wraps" },
  { test: /\bpita\b/i, one: "pita", many: "pitas" },
  { test: /\bpancakes?\b/i, one: "pancake", many: "pancakes" },
  { test: /\bwaffles?\b/i, one: "waffle", many: "waffles" },
  { test: /\b(sausage|hot dog|hotdog|link)\b/i, one: "link", many: "links" },
  { test: /\bslices?\b/i, one: "slice", many: "slices" },
  { test: /\bbanana\b/i, one: "banana", many: "bananas" },
  { test: /\bapple\b/i, one: "apple", many: "apples" },
  { test: /\borange\b/i, one: "orange", many: "oranges" },
];
// Names that describe a prepared dish, where a "piece" count is meaningless.
const NOT_A_PIECE = /\b(scrambled|fried|boiled|poached|salad|benedict|sandwich|burger|soup|casserole|pudding|omelet|omelette|quiche|frittata|stir[\s-]?fry|french toast|toastie|melt)\b/i;

export function pieceUnitFor(name: string): { one: string; many: string } | null {
  if (!name || NOT_A_PIECE.test(name)) return null;
  for (const r of PIECE_RULES) if (r.test.test(name)) return { one: r.one, many: r.many };
  return null;
}

/** Grams for `qty` of `unit`, using the product's serving size where relevant. */
export function gramsForPortion(qty: number, unit: PortionUnit, servingSizeG?: number | null): number {
  const q = Number.isFinite(qty) ? qty : 0;
  const serving = servingSizeG && servingSizeG > 0 ? servingSizeG : 100;
  const piece = servingSizeG && servingSizeG > 0 ? servingSizeG : 50;
  let grams: number;
  switch (unit) {
    case "g": grams = q; break;
    case "oz": grams = q * G_PER_OZ; break;
    case "serving": grams = q * serving; break;
    case "cup": grams = q * 240; break;
    case "tbsp": grams = q * 15; break;
    case "tsp": grams = q * 5; break;
    case "piece": grams = q * piece; break;
    case "handful": grams = q * 30; break;
    default: grams = q;
  }
  return Math.round(grams);
}
