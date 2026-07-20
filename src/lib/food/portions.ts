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
