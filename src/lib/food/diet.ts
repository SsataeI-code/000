/**
 * Dietary patterns & food preferences (client-customizable). Pure and tested:
 * classify a food by name and decide whether it fits a client's chosen eating
 * style (vegan, vegetarian, pescatarian, mediterranean, carnivore, or anything)
 * plus a free-text "avoid" list. Used to filter food *recommendations* — the
 * full catalog stays searchable/loggable, we just don't suggest off-plan foods.
 * Heuristic by design (name keywords), erring toward not over-restricting.
 */

export type DietPattern =
  | "anything"
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "mediterranean"
  | "carnivore";

export const DIET_OPTIONS: { value: DietPattern; label: string; help: string }[] = [
  { value: "anything", label: "Anything", help: "No restrictions." },
  { value: "vegetarian", label: "Vegetarian", help: "No meat or fish." },
  { value: "vegan", label: "Vegan", help: "No animal products." },
  { value: "pescatarian", label: "Pescatarian", help: "Fish, but no other meat." },
  { value: "mediterranean", label: "Mediterranean", help: "Fish, veg, whole grains — light on red meat." },
  { value: "carnivore", label: "Carnivore", help: "Animal foods only." },
];

const VALUES = new Set(DIET_OPTIONS.map((o) => o.value));
export const isDietPattern = (v: unknown): v is DietPattern => typeof v === "string" && VALUES.has(v as DietPattern);
export const dietLabel = (v: DietPattern): string => DIET_OPTIONS.find((o) => o.value === v)?.label ?? "Anything";

const POULTRY = /\b(chicken|turkey|duck|goose|quail|poultry|hen)\b/i;
const RED_MEAT = /\b(beef|steak|pork|bacon|ham|lamb|veal|bison|buffalo|venison|goat|rabbit|brisket|ribs?)\b/i;
const PROCESSED_MEAT = /\b(sausage|salami|pepperoni|prosciutto|pastrami|bologna|mortadella|hot ?dog|jerky|chorizo|liverwurst|deli meat|lunch meat)\b/i;
const ORGAN = /\b(liver|kidney|tongue|gizzard|tripe|heart)\b/i;
const FISH = /\b(salmon|tuna|cod|tilapia|shrimp|prawn|crab|lobster|sardine|anchovy|trout|halibut|mackerel|herring|oyster|clam|mussel|scallop|fish|seafood|caviar|pollock|snapper|bass|catfish)\b/i;
const DAIRY = /\b(milk|cheese|yogurt|yoghurt|butter|cream|whey|casein|kefir|ghee|custard|ice ?cream|cottage|paneer|ricotta|mozzarella|cheddar|parmesan|feta)\b/i;
const EGG = /\begg\b/i;
const HONEY = /\bhoney\b/i;

export interface FoodTags {
  meat: boolean; // any land meat incl. poultry/red/processed/organ
  fish: boolean;
  dairy: boolean;
  egg: boolean;
  animal: boolean; // any animal-derived food
}

export function classifyFood(name: string): FoodTags {
  const n = name ?? "";
  const meat = POULTRY.test(n) || RED_MEAT.test(n) || PROCESSED_MEAT.test(n) || ORGAN.test(n);
  const fish = FISH.test(n);
  const dairy = DAIRY.test(n);
  const egg = EGG.test(n);
  const animal = meat || fish || dairy || egg || HONEY.test(n);
  return { meat, fish, dairy, egg, animal };
}

/** Does this food fit the diet pattern? */
export function fitsDiet(name: string, diet: DietPattern): boolean {
  const t = classifyFood(name);
  switch (diet) {
    case "vegan":
      return !t.animal;
    case "vegetarian":
      return !t.meat && !t.fish;
    case "pescatarian":
      return !t.meat; // fish/dairy/egg ok
    case "mediterranean":
      // The defining restriction: light on red & processed meat.
      return !RED_MEAT.test(name) && !PROCESSED_MEAT.test(name) && !ORGAN.test(name);
    case "carnivore":
      return t.animal; // animal foods only
    case "anything":
    default:
      return true;
  }
}

/** Parse a free-text avoid list into lowercase keywords (≥2 chars). */
export function parseAvoid(avoid: string | null | undefined): string[] {
  return (avoid ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length >= 2);
}

/** Is this food on the avoid list? Substring match, tolerant of a trailing plural "s". */
export function isAvoided(name: string, avoidKeywords: string[]): boolean {
  const n = (name ?? "").toLowerCase();
  return avoidKeywords.some((k) => n.includes(k) || (k.endsWith("s") && k.length > 3 && n.includes(k.slice(0, -1))));
}

export interface DietFilter {
  pattern: DietPattern;
  avoid: string[];
}

/** The one call recommenders use: keep only foods that fit the pattern and aren't avoided. */
export function allowedByDiet(name: string, filter: DietFilter): boolean {
  return fitsDiet(name, filter.pattern) && !isAvoided(name, filter.avoid);
}
