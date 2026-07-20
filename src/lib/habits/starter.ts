import type { ActivityLevel, Goal } from "@/lib/nutrition/types";
import type { HabitCadence, HabitCategory, HabitType } from "@/lib/types/db";

/**
 * Starter daily habits, tailored to the client's intake (§8 first-run, §5A).
 * These are created at onboarding so day one already has the right things to
 * check off — then the client OR the coach can edit, add, or remove any of them.
 * Sensible defaults, never a fixed cage.
 */
export interface HabitSeed {
  name: string;
  category: HabitCategory;
  type: HabitType;
  cadence: HabitCadence;
  target: number | null;
  unit: string | null;
  why: string | null;
}

function h(
  name: string,
  category: HabitCategory,
  why: string,
  extra: Partial<HabitSeed> = {},
): HabitSeed {
  return { name, category, type: "checkbox", cadence: "daily", target: null, unit: null, why, ...extra };
}

/** Build the tailored starter set (daily habits) from goal + activity level. */
export function starterHabits(goal: Goal, activity: ActivityLevel): HabitSeed[] {
  const seeds: HabitSeed[] = [
    h("Log your meals", "nutrition", "Awareness is the first win — you can't steer what you don't see."),
    h("Hit your water goal", "hydration", "Energy, recovery, and appetite all ride on hydration."),
    h("7+ hours of sleep", "sleep", "Sleep runs your hunger, energy, and recovery."),
  ];

  // Protein anchor for every goal except habits-only.
  if (goal !== "habits_only") {
    seeds.push(h("Protein with every meal", "nutrition", "Protein keeps you full and protects muscle."));
  }

  // Movement, dialed to the goal.
  switch (goal) {
    case "lose":
      seeds.push(h("8,000 steps", "movement", "Easy, joint-friendly calorie burn that adds up.", { type: "counter", target: 8000, unit: "steps" }));
      break;
    case "gain":
      seeds.push(h("Movement or training session", "movement", "Give your body a reason to build."));
      seeds.push(h("Eat a 4th meal or snack", "nutrition", "Growing takes fuel — don't skip it."));
      break;
    case "maintain":
    case "recomp":
      seeds.push(h("30 minutes of movement", "movement", "Consistent motion keeps everything ticking.", { type: "duration", target: 30, unit: "min" }));
      break;
    case "habits_only":
      seeds.push(h("10-minute walk", "movement", "Small and doable — that's the whole point."));
      seeds.push(h("One mindful minute", "mindfulness", "A single calm breath resets the day."));
      break;
  }

  // Activity nudge.
  if (activity === "sedentary") {
    seeds.push(h("Stand and move every hour", "recovery", "Break up the sitting — your back will thank you."));
  } else if (activity === "very" || activity === "athlete") {
    seeds.push(h("Stretch or mobility", "recovery", "Hard training needs real recovery to stick."));
  }

  return seeds.slice(0, 6);
}
