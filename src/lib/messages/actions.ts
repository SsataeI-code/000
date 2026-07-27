"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { coachHasClient } from "@/lib/coach/data";
import { getClientCoachId } from "@/lib/messages/data";
import { notify } from "@/lib/notifications/data";
import { draftNudge } from "@/lib/coach/slip";
import type { FlagKind } from "@/lib/coach/attention";

export interface SendState {
  error?: string;
  ok?: boolean;
}

const MAX = 4000;
const FLAG_KINDS: FlagKind[] = ["quiet", "no_food", "missed_habits", "weight_off"];

/**
 * Coach → client message (§10). A real person's message, labeled as the coach.
 * Authorized to the coach's own client (owner may message anyone).
 */
export async function sendCoachMessageAction(clientId: string, _prev: SendState, formData: FormData): Promise<SendState> {
  const user = await getSessionUser();
  if (!user || (user.role !== "coach" && user.role !== "owner")) return { error: "Not allowed." };
  if (user.role !== "owner" && !(await coachHasClient(user.id, clientId))) return { error: "Not allowed." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a message first." };
  if (body.length > MAX) return { error: "That message is too long." };

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    coach_id: user.id,
    client_id: clientId,
    sender_id: user.id,
    kind: "coach",
    body,
  });
  if (error) return { error: "Couldn't send — try again." };
  await notify({
    recipientId: clientId,
    kind: "message",
    title: "New message from your coach",
    body: body.slice(0, 140),
    link: "/client/messages",
  });
  revalidatePath(`/coach/messages/${clientId}`);
  revalidatePath("/coach/messages");
  revalidatePath("/client/messages");
  return { ok: true };
}

/**
 * Send an auto-nudge (§9 hybrid, §10 transparency). A warm, forgiving note in
 * the coach's brand voice, labeled `kind: "nudge"` so the client sees it's from
 * the app — the coach taps send (§11 "AI drafts; the coach sends"). Phase 5
 * swaps the template for an AI draft grounded in the client's real data.
 */
export async function sendNudgeAction(clientId: string, primaryRaw: string): Promise<SendState> {
  const user = await getSessionUser();
  if (!user || (user.role !== "coach" && user.role !== "owner")) return { error: "Not allowed." };
  if (user.role !== "owner" && !(await coachHasClient(user.id, clientId))) return { error: "Not allowed." };

  const supabase = await createClient();
  const { data: nameRow } = await supabase.from("profiles").select("display_name").eq("id", clientId).maybeSingle();
  const primary = (FLAG_KINDS as string[]).includes(primaryRaw) ? (primaryRaw as FlagKind) : null;
  const body = draftNudge(nameRow?.display_name ?? null, primary);

  const { error } = await supabase.from("messages").insert({
    coach_id: user.id,
    client_id: clientId,
    sender_id: user.id,
    kind: "nudge",
    body,
  });
  if (error) return { error: "Couldn't send — try again." };
  await notify({
    recipientId: clientId,
    kind: "nudge",
    title: "A little nudge for today",
    body: body.slice(0, 140),
    link: "/client/messages",
  });
  revalidatePath(`/coach/messages/${clientId}`);
  revalidatePath("/coach/messages");
  revalidatePath("/coach");
  revalidatePath("/client/messages");
  return { ok: true };
}

/**
 * Client → coach message (§10). Resolves the client's coach (or the owner) so
 * the thread always has a home.
 */
export async function sendClientMessageAction(_prev: SendState, formData: FormData): Promise<SendState> {
  const user = await getSessionUser();
  if (!user || user.role !== "client") return { error: "Not allowed." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a message first." };
  if (body.length > MAX) return { error: "That message is too long." };

  const coachId = await getClientCoachId(user.id);
  if (!coachId) return { error: "No coach is set up yet — hang tight." };

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    coach_id: coachId,
    client_id: user.id,
    sender_id: user.id,
    kind: "client",
    body,
  });
  if (error) return { error: "Couldn't send — try again." };
  await notify({
    recipientId: coachId,
    kind: "message",
    title: "New message from a client",
    body: body.slice(0, 140),
    link: `/coach/messages/${user.id}`,
  });
  revalidatePath("/client/messages");
  revalidatePath(`/coach/messages/${user.id}`);
  revalidatePath("/coach/messages");
  return { ok: true };
}
