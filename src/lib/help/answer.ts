/**
 * No-AI "answer helper" (a rule-based companion to the coach↔client chat). It
 * answers common questions instantly from the client's OWN logged data plus a
 * small preset FAQ — no API key, no cost, and it never invents numbers. Anything
 * it can't answer is routed to the coach. Pure and tested.
 */

export interface HelpContext {
  firstName: string | null;
  goal: string;
  remaining: { calories: number; proteinG: number; carbsG: number; fatG: number } | null;
  waterOz: number;
  waterGoalOz: number;
  habitsDue: { name: string; done: boolean }[];
}

const r = (n: number) => Math.max(0, Math.round(n));
const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

export const HELP_STARTERS = [
  "How much protein do I have left?",
  "How many calories are left today?",
  "How's my water today?",
  "What habits do I still have to do?",
  "How do I scan a barcode?",
];

/** Answer a question from the client's real data + a small FAQ, or route to coach. */
export function answerQuestion(qRaw: string, ctx: HelpContext): string {
  const q = qRaw.toLowerCase().trim();
  if (!q) return "Ask me about your calories, protein, water, or today's habits.";

  const name = ctx.firstName ? `, ${ctx.firstName}` : "";

  // --- Greetings ---
  if (has(q, "hi", "hey", "hello", "yo ") || q === "help") {
    return `Hey${name}! I can tell you what's left today — calories, protein, carbs, fat, water — and which habits you still have to do. What do you want to know?`;
  }

  // --- FAQ (how-to) ---
  if (has(q, "barcode", "scan")) {
    return "Tap Add food → Scan, then point your camera at the barcode. If a product isn't found, you can fill in the macros in a tap and it saves for next time.";
  }
  if (has(q, "photo", "picture")) {
    return "When you log food you can attach a photo — it's private, only you and your coach can see it.";
  }
  if (has(q, "streak", "freeze")) {
    return "Your streak freeze protects one missed day — a second missed day in a row breaks it. So one slip won't wipe your progress. Keep going!";
  }
  if (has(q, "change", "goal", "target", "macro goal", "adjust")) {
    return "Your coach sets your targets and goal. Send them a message from the Coach tab and they'll adjust it for you.";
  }
  if (has(q, "how do i log", "add food", "how to log", "log food")) {
    return "Head to the Food tab (or Add food on Today) — scan a barcode, search a food, or add it manually.";
  }

  // --- Data-driven (never invents numbers) ---
  if (has(q, "protein")) {
    if (!ctx.remaining) return "You don't have targets set yet — your coach can generate them.";
    const left = ctx.remaining.proteinG;
    return left > 0
      ? `You've got about ${r(left)}g of protein left today. Easy wins: a palm of chicken or fish, Greek yogurt, cottage cheese, or a scoop of whey.`
      : "You've hit your protein for today — nice work.";
  }
  if (has(q, "calorie", "cals", "how many cal", "kcal")) {
    if (!ctx.remaining) return "You don't have targets set yet — your coach can generate them.";
    const left = ctx.remaining.calories;
    return left > 0 ? `You have about ${r(left)} calories left today.` : "You're at your calorie target for today.";
  }
  if (has(q, "carb")) {
    if (!ctx.remaining) return "You don't have targets set yet — your coach can generate them.";
    return `About ${r(ctx.remaining.carbsG)}g of carbs left today.`;
  }
  if (has(q, "fat")) {
    if (!ctx.remaining) return "You don't have targets set yet — your coach can generate them.";
    return `About ${r(ctx.remaining.fatG)}g of fat left today.`;
  }
  if (has(q, "water", "hydrat", "drink")) {
    const left = ctx.waterGoalOz - ctx.waterOz;
    return left > 0
      ? `You're at ${r(ctx.waterOz)} of ${r(ctx.waterGoalOz)} oz — about ${r(left)} oz to go. A bottle is ~17 oz.`
      : `You've hit your water goal today (${r(ctx.waterGoalOz)} oz) — great.`;
  }
  if (has(q, "habit", "today", "left to do", "to do", "check off")) {
    const pending = ctx.habitsDue.filter((h) => !h.done).map((h) => h.name);
    if (ctx.habitsDue.length === 0) return "No habits are due today.";
    return pending.length > 0
      ? `Still to check off today: ${pending.join(", ")}. You've got this.`
      : "You've done all your habits for today — perfect day!";
  }
  if (has(q, "eat", "meal", "snack", "hungry", "what should")) {
    if (!ctx.remaining) return "Once your targets are set, I can tell you what fits. For now, aim for a protein source plus veg.";
    return `You've got about ${r(ctx.remaining.calories)} cal and ${r(ctx.remaining.proteinG)}g protein left. Lead with a protein source — chicken, fish, eggs, Greek yogurt — and add veg to stay full.`;
  }

  // --- Fallback: route to the coach ---
  return "I can help with your calories, protein, carbs, fat, water, and today's habits — just ask. For anything else, message your coach from the Coach tab.";
}
