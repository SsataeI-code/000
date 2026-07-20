import type { HabitCategory } from "@/lib/types/db";

/**
 * Ready-made habit ideas the client can adopt at onboarding (§5A). The point is
 * ownership — they pick or write ONE that's theirs, so the app feels personal
 * from minute one. Grouped loosely; each carries a sensible category.
 */
export interface HabitIdea {
  name: string;
  category: HabitCategory;
}

export const HABIT_IDEAS: HabitIdea[] = [
  { name: "No screens for the first hour", category: "mindfulness" },
  { name: "Read 10 minutes", category: "mindfulness" },
  { name: "Meditate 5 minutes", category: "mindfulness" },
  { name: "Journal 3 lines", category: "mindfulness" },
  { name: "Walk after dinner", category: "movement" },
  { name: "10 push-ups", category: "movement" },
  { name: "Stretch for 5 minutes", category: "recovery" },
  { name: "Take the stairs", category: "movement" },
  { name: "Veggies at lunch", category: "nutrition" },
  { name: "No soda today", category: "nutrition" },
  { name: "No snacking after 8pm", category: "nutrition" },
  { name: "In bed by 11pm", category: "sleep" },
];

const VALID: HabitCategory[] = ["nutrition", "movement", "sleep", "mindfulness", "hydration", "recovery"];

/** Category for a chosen idea (or a safe default for a custom one). */
export function categoryForIdea(name: string): HabitCategory {
  const found = HABIT_IDEAS.find((i) => i.name === name);
  return found ? found.category : "movement";
}

export function isHabitCategory(v: string): v is HabitCategory {
  return (VALID as string[]).includes(v);
}
