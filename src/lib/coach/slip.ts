import type { AttentionFlag, FlagKind } from "@/lib/coach/attention";

/**
 * Slip response (§9 hybrid). Small, one-off slips get a same-day warm nudge from
 * the app; slips that persist or stack escalate to the coach for a personal
 * touch. Pure and testable — decides the *level*; the coach is always the last
 * tap on anything that escalates. Never shaming (§4 voice).
 */

export type SlipLevel = "none" | "nudge" | "escalate";

export interface SlipDecision {
  level: SlipLevel;
  primary: FlagKind | null; // the flag the nudge should speak to
  reason: string;
}

const ESCALATE_SCORE = 55; // a silent week (60) or stacked flags land here

/**
 * Classify a client's current flags into none / nudge / escalate.
 * - escalate: multiple flags at once, a hard "silent ≥7d" quiet, weight drifting
 *   the wrong way over weeks, or a high combined score.
 * - nudge: exactly one mild, recoverable slip (a missed habit, a skipped log day,
 *   a short quiet spell).
 */
export function classifySlip(flags: AttentionFlag[], score: number): SlipDecision {
  if (flags.length === 0) return { level: "none", primary: null, reason: "On track." };

  const kinds = new Set(flags.map((f) => f.kind));
  const hardQuiet = flags.some((f) => f.kind === "quiet" && f.severity >= 60);

  if (flags.length >= 2 || score >= ESCALATE_SCORE || hardQuiet || kinds.has("weight_off")) {
    return {
      level: "escalate",
      primary: flags.slice().sort((a, b) => b.severity - a.severity)[0].kind,
      reason: hardQuiet
        ? "Gone quiet for a week — reach out personally."
        : kinds.has("weight_off")
          ? "Weight is drifting off-goal — worth a real conversation."
          : flags.length >= 2
            ? "A few things are stacking up — a personal check-in lands better."
            : "This has gone past a quick nudge.",
    };
  }

  return {
    level: "nudge",
    primary: flags[0].kind,
    reason: "A small, one-off slip — a warm same-day nudge is enough.",
  };
}

/**
 * A warm, forgiving nudge in the coach's brand voice (§4, §10). Templated per
 * slip so it's grounded and never shaming. In Phase 5 the AI drafts this from
 * the client's real data; the coach still taps send.
 */
export function draftNudge(name: string | null, primary: FlagKind | null): string {
  const first = name?.split(" ")[0] ?? "there";
  switch (primary) {
    case "no_food":
      return `Hey ${first} — no stress about the last couple of days. Want to pop in one thing you ate today? A single log gets the momentum back.`;
    case "missed_habits":
      return `Hi ${first}! Life happens. One tiny habit checked off today beats a perfect week you never start. Which one feels easiest right now?`;
    case "quiet":
      return `Hey ${first}, just checking in — no guilt, ever. Even a 30-second open today keeps your streak alive. I'm in your corner.`;
    case "weight_off":
      return `Hey ${first} — the scale bounces around, that's normal. Let's look at the trend together, not one day. Proud of you for sticking with it.`;
    default:
      return `Hey ${first} — checking in. Small steps today, that's all. You've got this, and I'm right here.`;
  }
}
