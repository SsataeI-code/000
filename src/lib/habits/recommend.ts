import type { Goal, HabitCategory, ActivityLevel } from "@/lib/types/db";

/**
 * Adaptive habit-recommendation engine (§5A): reads a client's real behavior and
 * suggests the **next right habit — one at a time, only after the last one
 * sticks**. Pure and tested. It never piles on: if the newest habit isn't
 * established yet, or the client is already well-rounded, it recommends nothing.
 */

export interface ExistingHabit {
  category: HabitCategory;
  consistency: number; // 0..1 over the recent window
  ageDays: number; // days since created
}

export interface HabitRecInput {
  goal: Goal;
  activity: ActivityLevel | null;
  existing: ExistingHabit[];
}

export interface HabitRecommendation {
  name: string;
  category: HabitCategory;
  why: string;
}

// "The last one sticks" gate: the newest habit must be this old and this consistent.
export const STICK_MIN_AGE_DAYS = 10;
export const STICK_MIN_CONSISTENCY = 0.6;
// Don't overwhelm — stop suggesting past this many active habits.
export const MAX_HABITS_BEFORE_PAUSE = 6;

/** One strong candidate per category. Movement/hydration are usually already covered by starters. */
const CANDIDATE: Record<HabitCategory, HabitRecommendation> = {
  sleep: { name: "Lights out by 11pm", category: "sleep", why: "Sleep drives recovery, appetite, and next-day willpower." },
  nutrition: { name: "Protein with every meal", category: "nutrition", why: "Protein keeps you full and protects muscle." },
  mindfulness: { name: "2-min breathing reset", category: "mindfulness", why: "Lowers stress — the quiet driver of cravings and skipped days." },
  recovery: { name: "10-min evening stretch", category: "recovery", why: "Loosens up, winds you down, and helps you move tomorrow." },
  movement: { name: "10-min walk after dinner", category: "movement", why: "Easy daily movement that steadies energy and blood sugar." },
  hydration: { name: "A glass of water on waking", category: "hydration", why: "Starts the day hydrated and builds the water habit." },
};

/** Order categories to introduce by goal — the most impactful first. */
const PRIORITY: Record<Goal, HabitCategory[]> = {
  lose: ["nutrition", "movement", "sleep", "mindfulness", "recovery", "hydration"],
  gain: ["nutrition", "recovery", "sleep", "movement", "mindfulness", "hydration"],
  recomp: ["nutrition", "sleep", "movement", "recovery", "mindfulness", "hydration"],
  maintain: ["sleep", "movement", "nutrition", "mindfulness", "hydration", "recovery"],
  habits_only: ["sleep", "mindfulness", "movement", "hydration", "nutrition", "recovery"],
};

/** Is the client ready for a new habit? (Newest one has stuck; not overloaded.) */
export function readyForNextHabit(input: HabitRecInput): boolean {
  const n = input.existing.length;
  if (n === 0 || n >= MAX_HABITS_BEFORE_PAUSE) return false;
  // The "last one" is the newest habit (smallest ageDays).
  const newest = input.existing.reduce((a, b) => (b.ageDays < a.ageDays ? b : a));
  return newest.ageDays >= STICK_MIN_AGE_DAYS && newest.consistency >= STICK_MIN_CONSISTENCY;
}

/**
 * The next habit to suggest, or null when it's not time (last one hasn't stuck,
 * they're overloaded, or every category is already covered).
 */
export function recommendNextHabit(input: HabitRecInput): HabitRecommendation | null {
  if (!readyForNextHabit(input)) return null;
  const have = new Set(input.existing.map((h) => h.category));
  const order = PRIORITY[input.goal] ?? PRIORITY.maintain;
  for (const cat of order) {
    if (!have.has(cat)) return CANDIDATE[cat];
  }
  return null; // well-rounded — no new category to add
}
