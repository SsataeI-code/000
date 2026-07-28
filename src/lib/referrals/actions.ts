"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import type { ReferralStatus } from "@/lib/types/db";

export interface ReferralActionState {
  ok?: boolean;
  error?: string;
}

/**
 * Coach processes a referral: reward (default 10%, coach controls it) or waive.
 * Authorization is enforced inside the `process_referral` RPC (owning coach or
 * owner only) — we never trust the client to be allowed.
 */
export async function processReferralAction(
  id: string,
  status: Extract<ReferralStatus, "rewarded" | "declined">,
  note?: string,
): Promise<ReferralActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in again." };
  if (status !== "rewarded" && status !== "declined") return { error: "Unknown action." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("process_referral", {
    p_id: id,
    p_status: status,
    p_note: note?.trim() ? note.trim() : null,
  });
  if (error) return { error: "Couldn't update that referral. Try again." };

  revalidatePath("/coach/referrals");
  return { ok: true };
}
