import type { AttentionFlag } from "@/lib/coach/attention";
import type { Goal } from "@/lib/types/db";

/**
 * Weekly reports (§12) — pure, tested, rule-based (no AI required; the Claude
 * path can enrich later). The client recap celebrates real wins and offers 1–3
 * honest, forgiving things to work on — never a lecture, never shaming. The
 * coach digest summarizes who moved, who slipped, and who needs a Monday touch.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;

// ---------- Client weekly recap ----------

export interface WeeklyRecapInput {
  habitConsistency: number; // 0..1 across the week
  perfectDays: number; // 0..7
  daysLoggedFood: number; // 0..7
  currentStreak: number; // days
  weightChangeLb: number | null; // negative = down over the week
  goal: Goal | null;
}

export interface WeeklyRecap {
  wins: string[]; // always ≥1
  focus: string[]; // always ≥1, constructive & forgiving
}

export function clientWeeklyRecap(i: WeeklyRecapInput): WeeklyRecap {
  const pct = Math.round(Math.max(0, Math.min(1, i.habitConsistency)) * 100);
  const wins: string[] = [];
  const focus: string[] = [];

  // --- Wins (celebrate) ---
  if (i.perfectDays >= 1) {
    wins.push(`${i.perfectDays} perfect ${i.perfectDays === 1 ? "day" : "days"} — every habit checked off.`);
  }
  if (i.habitConsistency >= 0.8) {
    wins.push(`You showed up ${pct}% of the week. That consistency is the whole game.`);
  } else if (i.habitConsistency >= 0.6) {
    wins.push(`Solid week — habits held at ${pct}%.`);
  }
  if (i.weightChangeLb != null) {
    const c = i.weightChangeLb;
    if (i.goal === "lose" && c <= -0.2) wins.push(`Down ${round1(Math.abs(c))} lb — right where you want to be.`);
    else if (i.goal === "gain" && c >= 0.2) wins.push(`Up ${round1(c)} lb — building steadily.`);
    else if ((i.goal === "maintain" || i.goal === "recomp") && Math.abs(c) <= 0.5)
      wins.push(`Weight holding steady — exactly the plan.`);
  }
  if (i.daysLoggedFood >= 6) {
    wins.push(`Food logged ${i.daysLoggedFood} of 7 days. That awareness compounds.`);
  }
  if (i.currentStreak >= 3) {
    wins.push(`${i.currentStreak}-day streak going strong.`);
  }
  if (wins.length === 0) {
    wins.push(`You showed up this week — that's the habit underneath all the others.`);
  }

  // --- Focus (1–3, forgiving) ---
  if (i.daysLoggedFood <= 4) {
    focus.push(`Food logging dipped midweek — even a quick log on one more day sharpens the picture.`);
  }
  if (i.habitConsistency < 0.6) {
    focus.push(`Habits got busy this week. Pick the one that matters most and anchor it to something you already do.`);
  }
  if (i.weightChangeLb != null) {
    const c = i.weightChangeLb;
    if (i.goal === "lose" && c >= 0.4) focus.push(`Weight ticked up a touch — normal week to week. Let's watch the trend, not the day.`);
    else if (i.goal === "gain" && c <= -0.4) focus.push(`Weight dipped this week — we'll nudge food up a little.`);
  }
  if (i.currentStreak === 0 && i.habitConsistency < 0.8) {
    focus.push(`The streak reset — no big deal. Today is a clean first day.`);
  }
  if (focus.length === 0) {
    focus.push(`Nothing to change — keep doing exactly what you're doing.`);
  }

  return { wins: wins.slice(0, 4), focus: focus.slice(0, 3) };
}

// ---------- Coach digest ----------

export interface DigestClient {
  name: string;
  goal: Goal;
  daysSinceActivity: number;
  weightChangeLb: number | null;
  currentStreak: number;
  flags: AttentionFlag[];
}

export interface CoachDigest {
  total: number;
  activeThisWeek: number;
  celebrate: string[];
  needsYou: { name: string; reason: string }[];
}

export function coachDigest(clients: DigestClient[]): CoachDigest {
  const activeThisWeek = clients.filter((c) => c.daysSinceActivity <= 7).length;

  const celebrate: string[] = [];
  for (const c of clients) {
    if (c.currentStreak >= 7) {
      celebrate.push(`${c.name} is on a ${c.currentStreak}-day streak.`);
    } else if (c.weightChangeLb != null) {
      const w = c.weightChangeLb;
      if (c.goal === "lose" && w <= -0.5) celebrate.push(`${c.name} is down ${round1(Math.abs(w))} lb.`);
      else if (c.goal === "gain" && w >= 0.5) celebrate.push(`${c.name} is up ${round1(w)} lb.`);
    }
  }

  const needsYou = clients
    .filter((c) => c.flags.length > 0)
    .map((c) => ({
      name: c.name,
      severity: c.flags.reduce((s, f) => s + f.severity, 0),
      reason: [...c.flags].sort((a, b) => b.severity - a.severity)[0]?.label ?? "Needs a look",
    }))
    .sort((a, b) => b.severity - a.severity)
    .map(({ name, reason }) => ({ name, reason }));

  return {
    total: clients.length,
    activeThisWeek,
    celebrate: celebrate.slice(0, 6),
    needsYou: needsYou.slice(0, 10),
  };
}
