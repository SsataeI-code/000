import Anthropic from "@anthropic-ai/sdk";
import { sanitizeHeaderSafe } from "@/lib/supabase/env";

/**
 * Anthropic client for the in-app AI assistant (§11). SERVER ONLY — the API key
 * is never exposed to the browser. Gated on `ANTHROPIC_API_KEY`; the model is
 * `ANTHROPIC_MODEL` if set, else Claude Opus 5 (the current, most capable model).
 */
export function getAiModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5";
}

export function hasAiConfig(): boolean {
  return Boolean(sanitizeHeaderSafe(process.env.ANTHROPIC_API_KEY));
}

export function createAiClient(): Anthropic | null {
  const apiKey = sanitizeHeaderSafe(process.env.ANTHROPIC_API_KEY);
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}
