/**
 * Grounding context for the AI assistant (§11 "grounded in the client's real
 * data — never generic, never invented"). Pure string builders so the exact
 * data sent to the model is testable and never leaks anything unexpected.
 */

export interface AiClientContext {
  firstName: string | null;
  goal: string;
  dietPreference: string | null;
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number } | null;
  todayTotals: { calories: number; proteinG: number; carbsG: number; fatG: number };
  waterOz: number;
  waterGoalOz: number;
  habitsDueToday: { name: string; done: boolean }[];
}

const GOAL_LABEL: Record<string, string> = {
  lose: "fat loss", gain: "muscle gain", maintain: "maintenance", recomp: "recomposition", habits_only: "healthy habits (no weight goal)",
};

function round(n: number): number {
  return Math.round(n);
}

/** A compact, factual snapshot of the client's day — the model's ground truth. */
export function buildClientContext(c: AiClientContext): string {
  const lines: string[] = [];
  lines.push(`Client: ${c.firstName ?? "the client"}`);
  lines.push(`Goal: ${GOAL_LABEL[c.goal] ?? c.goal}${c.dietPreference ? ` · diet preference: ${c.dietPreference.replace("_", " ")}` : ""}`);

  if (c.targets) {
    const t = c.targets;
    const done = c.todayTotals;
    const remain = {
      cal: t.calories - done.calories,
      p: t.proteinG - done.proteinG,
      cb: t.carbsG - done.carbsG,
      f: t.fatG - done.fatG,
    };
    lines.push(
      `Daily targets: ${t.calories} cal, ${t.proteinG}g protein, ${t.carbsG}g carbs, ${t.fatG}g fat.`,
    );
    lines.push(
      `Logged so far today: ${round(done.calories)} cal, ${round(done.proteinG)}g protein, ${round(done.carbsG)}g carbs, ${round(done.fatG)}g fat.`,
    );
    lines.push(
      `Remaining today: ${round(remain.cal)} cal, ${round(remain.p)}g protein, ${round(remain.cb)}g carbs, ${round(remain.f)}g fat.`,
    );
  } else {
    lines.push("No nutrition targets set yet.");
  }

  lines.push(`Water: ${round(c.waterOz)} of ${round(c.waterGoalOz)} oz today.`);

  if (c.habitsDueToday.length > 0) {
    const pending = c.habitsDueToday.filter((h) => !h.done).map((h) => h.name);
    const done = c.habitsDueToday.filter((h) => h.done).map((h) => h.name);
    lines.push(`Habits due today — done: ${done.join(", ") || "none yet"}; still to do: ${pending.join(", ") || "none"}.`);
  }

  return lines.join("\n");
}

/** Coach-side context for drafting a message about a client. */
export interface AiCoachContext {
  clientFirstName: string | null;
  goal: string;
  daysSinceActivity: number;
  daysSinceFood: number;
  habitLevelName: string;
  currentStreak: number;
  flags: string[];
}

export function buildCoachContext(c: AiCoachContext): string {
  const lines: string[] = [];
  lines.push(`Client: ${c.clientFirstName ?? "the client"}`);
  lines.push(`Goal: ${GOAL_LABEL[c.goal] ?? c.goal}`);
  lines.push(`Last app activity: ${Number.isFinite(c.daysSinceActivity) ? `${c.daysSinceActivity} day(s) ago` : "never"}.`);
  lines.push(`Last food log: ${Number.isFinite(c.daysSinceFood) ? `${c.daysSinceFood} day(s) ago` : "never"}.`);
  lines.push(`Habit level: ${c.habitLevelName}; current streak: ${c.currentStreak} day(s).`);
  if (c.flags.length > 0) lines.push(`Flags: ${c.flags.join(", ")}.`);
  return lines.join("\n");
}
