"use server";

import { getSessionUser } from "@/lib/auth/session";
import { buildHelpContext } from "@/lib/help/context";
import type { HelpContext } from "@/lib/help/answer";

export interface HelpContextResult {
  ctx?: HelpContext;
  error?: string;
}

/**
 * Fetch the answer helper's live context on demand — called when the floating
 * helper drawer is first opened, so a client page load never pays for it. Scoped
 * to the signed-in client (no id from the browser is trusted).
 */
export async function getHelpContextAction(): Promise<HelpContextResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };
  try {
    const ctx = await buildHelpContext(user.id, user.profile?.display_name ?? null);
    return { ctx };
  } catch {
    return { error: "Couldn't load your numbers just now — try again in a moment." };
  }
}
