import { createClient } from "@/lib/supabase/server";
import type { Referral, ReferralStatus } from "@/lib/types/db";
import { summarizeReferrals, type ReferralStats } from "@/lib/referrals/code";

/** The caller's referral code, minted on first use (RPC is idempotent). */
export async function getMyReferralCode(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("ensure_referral_code");
  return (data as string | null) ?? null;
}

/**
 * A referrer's own referral tally — counts only, no names (§13 privacy: the
 * referrer shouldn't be handed a friend's identity just for inviting them).
 */
export async function getMyReferralStats(userId: string): Promise<ReferralStats> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("referrals")
    .select("status")
    .eq("referrer_id", userId);
  const statuses = ((data as { status: ReferralStatus }[] | null) ?? []).map((r) => r.status);
  return summarizeReferrals(statuses);
}

export interface CoachReferral extends Referral {
  referrerName: string;
  referredName: string;
}

/**
 * Referrals for a coach to process, newest first (§8: the coach controls the
 * reward). Names are looked up under RLS and fall back to a neutral label when a
 * participant isn't visible to this coach (e.g. a cross-coach referrer).
 */
export async function getCoachReferrals(
  coachId: string,
  scope: { owner?: boolean } = {},
): Promise<CoachReferral[]> {
  const supabase = await createClient();
  // The owner oversees every coach's referrals (§1); RLS permits it.
  let query = supabase.from("referrals").select("*").order("created_at", { ascending: false });
  if (!scope.owner) query = query.eq("coach_id", coachId);
  const { data } = await query;
  const rows = (data as Referral[] | null) ?? [];
  if (rows.length === 0) return [];

  const ids = Array.from(new Set(rows.flatMap((r) => [r.referrer_id, r.referred_id])));
  const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
  const nameById = new Map<string, string>();
  for (const p of (profs as { id: string; display_name: string | null }[] | null) ?? []) {
    if (p.display_name) nameById.set(p.id, p.display_name);
  }

  return rows.map((r) => ({
    ...r,
    referrerName: nameById.get(r.referrer_id) ?? "A member",
    referredName: nameById.get(r.referred_id) ?? "A new member",
  }));
}

/** Count of referrals still awaiting the coach's decision (for a badge). */
export async function getPendingReferralCount(
  coachId: string,
  scope: { owner?: boolean } = {},
): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("status", "joined");
  if (!scope.owner) query = query.eq("coach_id", coachId);
  const { count } = await query;
  return count ?? 0;
}
