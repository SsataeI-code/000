"use server";

import { getSessionUser } from "@/lib/auth/session";
import { createAiClient, getAiModel } from "@/lib/ai/client";

export interface FoodEstimate {
  name: string;
  grams: number | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: "low" | "medium" | "high";
}

export interface FoodPhotoResult {
  estimate?: FoodEstimate;
  error?: string;
}

const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const PROMPT = `You are a nutrition estimator. Look at the food in this photo and estimate the nutrition for the portion shown.
Return ONLY a compact JSON object, no prose, with these keys:
{"name": string, "grams": number, "calories": number, "proteinG": number, "carbsG": number, "fatG": number, "confidence": "low"|"medium"|"high"}
- name: a short human name for the meal/food.
- grams: your best estimate of the total weight of the portion shown.
- calories/proteinG/carbsG/fatG: whole numbers for the WHOLE portion shown.
- confidence: how sure you are.
These are ESTIMATES the person will confirm and edit — reasonable is fine.
If the image is not food, return {"name": "", "grams": 0, "calories": 0, "proteinG": 0, "carbsG": 0, "fatG": 0, "confidence": "low"}.`;

const num = (v: unknown): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/**
 * Estimate a food's macros from a photo via Claude vision (§11 — an estimate the
 * client confirms, never a silent invented final number; trust-but-verify like
 * a barcode scan). Gated on ANTHROPIC_API_KEY. `dataUrl` is a data: URL read
 * from the picked/snapped image, client-side.
 */
export async function analyzeFoodPhotoAction(dataUrl: string): Promise<FoodPhotoResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };

  const client = createAiClient();
  if (!client) return { error: "Photo estimates aren't switched on yet — your coach can enable it." };

  const m = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl ?? "");
  if (!m) return { error: "Couldn't read that image." };
  const mediaType = m[1];
  const data = m[2];
  if (!ALLOWED_MEDIA.has(mediaType)) return { error: "Use a JPEG or PNG photo." };
  // ~7MB base64 cap (Anthropic limit is generous, but keep it sane).
  if (data.length > 7_000_000) return { error: "That photo's too large — try a smaller one." };

  try {
    const res = await client.messages.create({
      model: getAiModel(),
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg", data } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });
    if (res.stop_reason === "refusal") return { error: "Couldn't read that photo — try logging it manually." };

    const text = res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: "Couldn't read the estimate — try again or log it manually." };
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
    if (!name) return { error: "That doesn't look like food — try another photo or log it manually." };

    const grams = num(parsed.grams);
    const estimate: FoodEstimate = {
      name: name.slice(0, 80),
      grams: grams > 0 ? grams : null,
      calories: num(parsed.calories),
      proteinG: num(parsed.proteinG),
      carbsG: num(parsed.carbsG),
      fatG: num(parsed.fatG),
      confidence: parsed.confidence === "high" ? "high" : parsed.confidence === "medium" ? "medium" : "low",
    };
    return { estimate };
  } catch {
    return { error: "Couldn't analyze that photo — try again or log it manually." };
  }
}
