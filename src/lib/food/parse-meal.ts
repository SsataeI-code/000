/**
 * Parse a spoken-style meal description into countable food items — the no-AI
 * path for "log my meal" from the Ask box. Pure and tested. It only splits and
 * counts; matching a name to real macros happens server-side against the food
 * catalog, so this never invents numbers.
 *
 * "I had 2 eggs, toast and a banana" → [{qty:2,name:"eggs"}, {qty:1,name:"toast"},
 * {qty:1,name:"banana"}]
 */

export interface MealItem {
  qty: number;
  name: string;
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, half: 0.5,
};

// Phrases that just introduce the meal — stripped before parsing.
const LEAD = /^(log|logged|add|track|i\s+(just\s+)?(ate|had|have|having|got)|ate|had|for\s+(breakfast|lunch|dinner|a\s+snack)\s*[:,]?)\s+/i;

// Filler words to drop from a food phrase.
const STOP = new Set(["of", "a", "an", "some", "the", "with", "and", "plus", "my", "large", "small", "medium"]);

/** True when the text reads like a meal to log (vs. a question). */
export function looksLikeMealLog(textRaw: string): boolean {
  const t = textRaw.toLowerCase().trim();
  if (!t) return false;
  if (t.includes("?")) return false;
  // Explicit intent, or an "I ate/had" opener.
  return /(^|\b)(log|logged|track)\b/.test(t) || /\bi\s+(just\s+)?(ate|had|have|having)\b/.test(t) || /^(ate|had)\b/.test(t);
}

/** Split a description into {qty, name} items. Best-effort, never throws. */
export function parseMealItems(textRaw: string): MealItem[] {
  let text = (textRaw ?? "").toLowerCase().trim();
  if (!text) return [];
  text = text.replace(LEAD, "").trim();
  // Normalize separators to commas: "and", "&", "plus", "with", newlines.
  text = text.replace(/\s+(and|&|plus|with)\s+/g, ", ").replace(/[\n;]+/g, ", ");

  const items: MealItem[] = [];
  for (const chunkRaw of text.split(",")) {
    const chunk = chunkRaw.trim();
    if (!chunk) continue;
    const tokens = chunk.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;

    let qty = 1;
    let start = 0;
    const first = tokens[0].replace(/[^a-z0-9./]/g, "");
    const asNum = Number(first);
    if (Number.isFinite(asNum) && asNum > 0) {
      qty = asNum;
      start = 1;
    } else if (first in NUMBER_WORDS) {
      qty = NUMBER_WORDS[first];
      start = 1;
    }

    const name = tokens
      .slice(start)
      .map((w) => w.replace(/[^a-z0-9-]/g, ""))
      .filter((w) => w && !STOP.has(w))
      .join(" ")
      .trim();
    if (!name) continue;
    items.push({ qty: qty > 0 && qty <= 50 ? qty : 1, name });
  }
  return items;
}
