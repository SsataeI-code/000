/**
 * Plate builder — specific foods (a teaching + fast-log tool). A curated palette
 * of common foods grouped by plate zone (veggies / protein / carbs / fats), each
 * with an approximate single-portion macro value drawn from standard reference
 * data (never invented). The client taps real foods onto a plate and sees the
 * macros build up, so "a balanced plate" becomes concrete, not abstract.
 *
 * Values are per typical hand-portion serving and are teaching approximations —
 * the UI always says so; this is not a precise weighed log.
 */

import type { PlateTotals } from "@/lib/nutrition/plate";

export type PlateZone = "veggie" | "protein" | "carb" | "fat";

export interface PlateFood {
  id: string;
  name: string;
  zone: PlateZone;
  portion: string; // human label, e.g. "1 palm"
  icon: string; // FoodIcon key
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export const ZONE_META: Record<PlateZone, { label: string; color: string; aim: string }> = {
  veggie: { label: "Veggies", color: "#34c759", aim: "half your plate" },
  protein: { label: "Protein", color: "#e10600", aim: "a quarter — a palm" },
  carb: { label: "Carbs", color: "#c9a227", aim: "a quarter — a cupped hand" },
  fat: { label: "Fats", color: "#7f8fa6", aim: "a thumb on the side" },
};

export const PLATE_ZONES: PlateZone[] = ["veggie", "protein", "carb", "fat"];

// Curated palette. Macros are per the stated portion (standard reference values).
export const PLATE_FOODS: PlateFood[] = [
  // Protein — a palm
  { id: "chicken", name: "Chicken breast", zone: "protein", portion: "1 palm", icon: "drumstick", calories: 165, proteinG: 31, carbsG: 0, fatG: 4 },
  { id: "beef", name: "Lean beef", zone: "protein", portion: "1 palm", icon: "steak", calories: 215, proteinG: 26, carbsG: 0, fatG: 12 },
  { id: "salmon", name: "Salmon", zone: "protein", portion: "1 palm", icon: "fish", calories: 210, proteinG: 23, carbsG: 0, fatG: 13 },
  { id: "shrimp", name: "Shrimp", zone: "protein", portion: "1 palm", icon: "fish", calories: 100, proteinG: 24, carbsG: 0, fatG: 1 },
  { id: "eggs", name: "Eggs", zone: "protein", portion: "2 eggs", icon: "egg", calories: 156, proteinG: 13, carbsG: 1, fatG: 11 },
  { id: "yogurt", name: "Greek yogurt", zone: "protein", portion: "1 cup", icon: "cup", calories: 130, proteinG: 22, carbsG: 8, fatG: 0 },
  { id: "tofu", name: "Tofu", zone: "protein", portion: "1 palm", icon: "cube", calories: 145, proteinG: 16, carbsG: 4, fatG: 9 },
  { id: "beans", name: "Beans / lentils", zone: "protein", portion: "1 cupped hand", icon: "beans", calories: 115, proteinG: 8, carbsG: 20, fatG: 0 },

  // Carbs — a cupped hand
  { id: "rice", name: "Rice", zone: "carb", portion: "1 cupped hand", icon: "bowl", calories: 150, proteinG: 3, carbsG: 33, fatG: 0 },
  { id: "potato", name: "Potato", zone: "carb", portion: "1 fist", icon: "potato", calories: 130, proteinG: 3, carbsG: 30, fatG: 0 },
  { id: "sweet_potato", name: "Sweet potato", zone: "carb", portion: "1 fist", icon: "potato", calories: 115, proteinG: 2, carbsG: 27, fatG: 0 },
  { id: "oats", name: "Oats", zone: "carb", portion: "1 cupped hand", icon: "bowl", calories: 150, proteinG: 5, carbsG: 27, fatG: 3 },
  { id: "pasta", name: "Pasta", zone: "carb", portion: "1 cupped hand", icon: "bowl", calories: 180, proteinG: 7, carbsG: 35, fatG: 1 },
  { id: "quinoa", name: "Quinoa", zone: "carb", portion: "1 cupped hand", icon: "bowl", calories: 160, proteinG: 6, carbsG: 29, fatG: 3 },
  { id: "bread", name: "Bread", zone: "carb", portion: "1 slice", icon: "bread", calories: 80, proteinG: 3, carbsG: 15, fatG: 1 },

  // Veggies — a fist (half the plate)
  { id: "broccoli", name: "Broccoli", zone: "veggie", portion: "1 fist", icon: "broccoli", calories: 30, proteinG: 2, carbsG: 6, fatG: 0 },
  { id: "salad", name: "Mixed salad", zone: "veggie", portion: "2 fists", icon: "leaf", calories: 20, proteinG: 1, carbsG: 4, fatG: 0 },
  { id: "spinach", name: "Spinach", zone: "veggie", portion: "2 fists", icon: "leaf", calories: 15, proteinG: 2, carbsG: 2, fatG: 0 },
  { id: "carrots", name: "Carrots", zone: "veggie", portion: "1 fist", icon: "carrot", calories: 30, proteinG: 1, carbsG: 7, fatG: 0 },
  { id: "peppers", name: "Peppers", zone: "veggie", portion: "1 fist", icon: "pepper", calories: 25, proteinG: 1, carbsG: 6, fatG: 0 },
  { id: "green_beans", name: "Green beans", zone: "veggie", portion: "1 fist", icon: "broccoli", calories: 30, proteinG: 2, carbsG: 7, fatG: 0 },
  { id: "tomatoes", name: "Tomatoes", zone: "veggie", portion: "1 fist", icon: "pepper", calories: 20, proteinG: 1, carbsG: 4, fatG: 0 },

  // Fats — a thumb
  { id: "olive_oil", name: "Olive oil", zone: "fat", portion: "1 thumb", icon: "drop", calories: 90, proteinG: 0, carbsG: 0, fatG: 10 },
  { id: "avocado", name: "Avocado", zone: "fat", portion: "half", icon: "avocado", calories: 120, proteinG: 1, carbsG: 6, fatG: 11 },
  { id: "nuts", name: "Nuts", zone: "fat", portion: "1 thumb", icon: "nuts", calories: 100, proteinG: 4, carbsG: 4, fatG: 9 },
  { id: "nut_butter", name: "Nut butter", zone: "fat", portion: "1 thumb", icon: "nuts", calories: 95, proteinG: 4, carbsG: 3, fatG: 8 },
  { id: "cheese", name: "Cheese", zone: "fat", portion: "1 thumb", icon: "cheese", calories: 110, proteinG: 7, carbsG: 1, fatG: 9 },
  { id: "seeds", name: "Seeds", zone: "fat", portion: "1 thumb", icon: "nuts", calories: 90, proteinG: 3, carbsG: 4, fatG: 8 },
];

export function plateFoodById(id: string): PlateFood | undefined {
  return PLATE_FOODS.find((f) => f.id === id);
}

export function foodsByZone(zone: PlateZone, foods: PlateFood[] = PLATE_FOODS): PlateFood[] {
  return foods.filter((f) => f.zone === zone);
}

/** Sum a selection of foods (repeats allowed) into total macros/calories. */
export function selectedTotals(foods: PlateFood[]): PlateTotals {
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  let calories = 0;
  for (const f of foods) {
    proteinG += f.proteinG;
    carbsG += f.carbsG;
    fatG += f.fatG;
    calories += f.calories;
  }
  return {
    proteinG: Math.round(proteinG),
    carbsG: Math.round(carbsG),
    fatG: Math.round(fatG),
    calories: Math.round(calories),
  };
}

/** How many portions the client has placed in each zone — for the plate visual. */
export function zoneCounts(foods: PlateFood[]): Record<PlateZone, number> {
  const counts: Record<PlateZone, number> = { veggie: 0, protein: 0, carb: 0, fat: 0 };
  for (const f of foods) counts[f.zone] += 1;
  return counts;
}

/**
 * A short, encouraging balance check against the plate method (half veggies, a
 * palm of protein, a cupped hand of carbs). Never shaming — it nudges the next
 * add, and celebrates a balanced plate (§4 voice). Returns null when balanced.
 */
export function plateBalanceHint(foods: PlateFood[]): string | null {
  if (foods.length === 0) return "Tap or search foods to build your plate.";
  const c = zoneCounts(foods);
  if (c.protein === 0) return "Add a protein — a palm-sized portion.";
  if (c.veggie === 0) return "Add some veggies — aim to fill half your plate.";
  const total = c.veggie + c.protein + c.carb + c.fat;
  if (c.veggie / total < 0.4) return "A few more veggies would round this out.";
  return null; // balanced enough — the UI shows a "balanced plate" note
}

/** A readable name for the food log, e.g. "Plate: chicken, rice, broccoli". */
export function plateLogName(foods: PlateFood[]): string {
  if (foods.length === 0) return "Plate";
  // De-dupe while keeping order, cap the label length.
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const f of foods) {
    const key = f.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(f.name.toLowerCase());
    }
  }
  const shown = unique.slice(0, 4).join(", ");
  const more = unique.length > 4 ? ` +${unique.length - 4}` : "";
  return `Plate: ${shown}${more}`;
}

// Keyword hints for spotting non-starchy veggies (low-cal, mostly water/fiber).
const VEGGIE_RE =
  /\b(veg|veggie|vegetable|broccoli|spinach|kale|lettuce|salad|greens|cabbage|cauliflower|pepper|tomato|cucumber|zucchini|courgette|carrot|celery|onion|mushroom|asparagus|bean sprout|green bean|pea|brussels|beet|radish|squash|eggplant|aubergine|okra)\b/;

/**
 * Classify an arbitrary food into a plate zone from its name + macros — so any
 * searched food can join the plate. Non-starchy veggies are caught by name (they
 * read as "carbs" by macros otherwise); everything else goes by its dominant
 * calorie source. Pure.
 */
export function zoneForFood(name: string, proteinG: number, carbsG: number, fatG: number): PlateZone {
  const n = (name || "").toLowerCase();
  const pCal = proteinG * 4;
  const cCal = carbsG * 4;
  const fCal = fatG * 9;
  const total = pCal + cCal + fCal;
  // Low-calorie, carb-leaning, and reads like a vegetable → veggie half.
  if (VEGGIE_RE.test(n) && fCal <= cCal) return "veggie";
  if (total <= 0) return "carb";
  if (pCal >= cCal && pCal >= fCal) return "protein";
  if (fCal > cCal && fCal >= pCal) return "fat";
  return "carb";
}

/** A flat icon key for a zone (used for custom/searched foods without their own icon). */
export function iconForZone(zone: PlateZone): string {
  return zone === "protein" ? "steak" : zone === "carb" ? "bowl" : zone === "veggie" ? "leaf" : "drop";
}

// Keyword → specific FoodIcon key, so a searched food gets a recognizable picture.
const ICON_RULES: [RegExp, string][] = [
  [/chicken|turkey|poultry|wing|drumstick/, "drumstick"],
  [/salmon|tuna|fish|cod|tilapia|shrimp|prawn|crab|lobster/, "fish"],
  [/beef|steak|burger|bison|lamb|pork|bacon|ham|sausage|venison/, "steak"],
  [/egg/, "egg"],
  [/tofu|tempeh|seitan/, "cube"],
  [/bean|lentil|chickpea|hummus/, "beans"],
  [/yogurt|milk|kefir|cream|latte|smoothie|protein shake/, "cup"],
  [/cheese|feta|parmesan|cheddar|mozzarella/, "cheese"],
  [/rice|quinoa|oat|pasta|noodle|couscous|barley|grain|cereal|porridge/, "bowl"],
  [/potato|yam|fries/, "potato"],
  [/bread|toast|bagel|roll|bun|wrap|tortilla|pita|naan|muffin|pancake|waffle/, "bread"],
  [/broccoli|green bean|asparagus|brussel|pea/, "broccoli"],
  [/carrot/, "carrot"],
  [/pepper|tomato|chili/, "pepper"],
  [/avocado|guac/, "avocado"],
  [/nut|almond|peanut|cashew|pistachio|walnut|seed/, "nuts"],
  [/apple|pear|berry|banana|orange|grape|fruit|melon|mango|peach/, "apple"],
  [/spinach|kale|lettuce|salad|greens|cabbage|arugula/, "leaf"],
  [/oil|butter|dressing|mayo/, "drop"],
];

/** Best specific icon for a food by name; falls back to the zone's default icon. */
export function iconForFood(name: string, zone: PlateZone): string {
  const n = (name || "").toLowerCase();
  for (const [re, icon] of ICON_RULES) if (re.test(n)) return icon;
  return iconForZone(zone);
}
