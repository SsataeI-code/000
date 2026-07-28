"use server";

import { getSessionUser } from "@/lib/auth/session";
import { createAiClient, getAiModel } from "@/lib/ai/client";
import { buildClientContext, buildCoachContext, type AiClientContext } from "@/lib/ai/context";
import { clientAssistantSystem, coachDraftSystem } from "@/lib/ai/prompts";
import {
  getClientProfile,
  getLatestTargets,
  getTodayFoodLogs,
  totalMacros,
} from "@/lib/nutrition/data";
import { getTodayWaterMl } from "@/lib/body/data";
import { getHabits, getHabitLogs, completedDatesByHabit } from "@/lib/habits/data";
import { isDueToday, isoDate } from "@/lib/habits/streaks";
import { getRoster } from "@/lib/coach/data";
import { classifySlip } from "@/lib/coach/slip";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}
export interface AiReply {
  reply?: string;
  error?: string;
}

const REFUSAL_REPLY =
  "I can't help with that one — please reach out to your coach, and if it's anything medical, a qualified professional.";

/** Pull the assistant text out of a response, handling a safety refusal. */
function replyText(res: { stop_reason: string | null; content: unknown[] }): string {
  if (res.stop_reason === "refusal") return REFUSAL_REPLY;
  const parts = (res.content as { type: string; text?: string }[])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string);
  return parts.join("\n").trim() || "Sorry — I didn't catch that. Mind trying again?";
}

/** Build the grounding context for the signed-in client from their real data. */
async function clientContextFor(userId: string, firstName: string | null): Promise<AiClientContext> {
  const [profile, targets, logs, waterMl, habits, habitLogs] = await Promise.all([
    getClientProfile(userId),
    getLatestTargets(userId),
    getTodayFoodLogs(userId),
    getTodayWaterMl(userId),
    getHabits(userId),
    getHabitLogs(userId),
  ]);
  const totals = totalMacros(logs);
  const byHabit = completedDatesByHabit(habitLogs);
  const now = new Date();
  const todayStr = isoDate(now);
  const habitsDueToday = habits
    .filter((h) => isDueToday(h, byHabit.get(h.id) ?? new Set<string>(), now))
    .map((h) => ({ name: h.name, done: (byHabit.get(h.id) ?? new Set<string>()).has(todayStr) }));

  return {
    firstName,
    goal: profile?.goal ?? "maintain",
    dietPreference: profile?.diet_preference ?? null,
    targets: targets
      ? { calories: targets.calories, proteinG: targets.protein_g, carbsG: targets.carbs_g, fatG: targets.fat_g }
      : null,
    todayTotals: { calories: totals.calories, proteinG: totals.proteinG, carbsG: totals.carbsG, fatG: totals.fatG },
    waterOz: waterMl / 29.5735,
    waterGoalOz: (profile?.water_goal_ml ?? 2500) / 29.5735,
    habitsDueToday,
  };
}

/**
 * Client AI assistant (§11) — grounded in their real data, guardrailed. Full
 * everyday help (meal ideas, swaps, questions within their targets); anything
 * medical or a plan change is steered to the coach.
 */
export async function askAssistantAction(history: ChatTurn[]): Promise<AiReply> {
  const user = await getSessionUser();
  if (!user || user.role !== "client") return { error: "Not allowed." };

  const client = createAiClient();
  if (!client) return { error: "The assistant isn't switched on yet — your coach can enable it." };

  const turns = history.filter((t) => t.content.trim()).slice(-12);
  if (turns.length === 0) return { error: "Ask me something to get started." };

  const firstName = user.profile?.display_name?.split(" ")[0] ?? null;
  const context = await clientContextFor(user.id, firstName);

  try {
    const res = await client.messages.create({
      model: getAiModel(),
      max_tokens: 4000,
      system: clientAssistantSystem(buildClientContext(context)),
      messages: turns.map((t) => ({ role: t.role, content: t.content })),
    });
    return { reply: replyText(res) };
  } catch {
    return { error: "The assistant is having a moment — try again in a bit." };
  }
}

/**
 * Coach-side AI draft (§11 "AI drafts; the coach sends"). Generates a short,
 * on-brand message from the client's real data; the coach reviews, edits, and
 * sends. Returns the draft text only — it never sends anything itself.
 */
export async function draftCoachMessageAction(clientId: string, intent: string): Promise<AiReply> {
  const user = await getSessionUser();
  if (!user || (user.role !== "coach" && user.role !== "owner")) return { error: "Not allowed." };

  const client = createAiClient();
  if (!client) return { error: "The assistant isn't switched on yet — add an Anthropic API key to enable it." };

  const roster = await getRoster(user.id, { owner: user.role === "owner" });
  const c = roster.find((r) => r.id === clientId);
  if (!c) return { error: "Couldn't find that client." };

  const decision = classifySlip(c.flags, c.score);
  const context = buildCoachContext({
    clientFirstName: c.name.split(" ")[0],
    goal: c.goal,
    daysSinceActivity: c.daysSinceActivity,
    daysSinceFood: c.daysSinceFood,
    habitLevelName: c.habitLevelName,
    currentStreak: c.habitCurrentStreak,
    flags: c.flags.map((f) => f.label),
  });
  const coachName = user.profile?.display_name?.split(" ")[0] ?? "your coach";
  const userMsg = intent.trim()
    ? `Write the message. What I want to get across: ${intent.trim()}`
    : `Write a warm check-in message for this client${decision.level === "escalate" ? " — they've slipped and could use a personal touch" : ""}.`;

  try {
    const res = await client.messages.create({
      model: getAiModel(),
      max_tokens: 2000,
      system: coachDraftSystem(context, coachName),
      messages: [{ role: "user", content: userMsg }],
    });
    return { reply: replyText(res) };
  } catch {
    return { error: "Couldn't draft that — try again in a bit." };
  }
}
