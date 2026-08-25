import { createClient } from "@/lib/supabase/server";
import type { Message } from "@/lib/types/db";

export interface ThreadSummary {
  clientId: string;
  clientName: string;
  lastBody: string | null;
  lastAt: string | null;
  lastKind: Message["kind"] | null;
  unread: number; // messages from the client the coach hasn't read
}

/**
 * The coach a client talks to: their active coach, or the owner for open
 * public sign-ups (§8). Returns null only if no owner exists yet.
 */
export async function getClientCoachId(clientId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: link } = await supabase
    .from("coach_clients")
    .select("coach_id")
    .eq("client_id", clientId)
    .eq("status", "active")
    .maybeSingle();
  if (link?.coach_id) return link.coach_id;
  const { data: owner } = await supabase.from("profiles").select("id").eq("role", "owner").limit(1).maybeSingle();
  return owner?.id ?? null;
}

/** All messages in one coach↔client thread, oldest first. */
export async function getThread(coachId: string, clientId: string): Promise<Message[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  return (data as Message[] | null) ?? [];
}

/**
 * Every message addressed to a client, oldest first — regardless of which
 * coach_id it was sent under. The client's view must not depend on correctly
 * guessing their single coach id: a message from the owner, or from a coach
 * whose id differs from the client's currently-resolved coach, must still show.
 * RLS already scopes this to the caller's own messages (client_id = auth.uid()).
 */
export async function getClientThread(clientId: string): Promise<Message[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  return (data as Message[] | null) ?? [];
}

/** Mark all coach/nudge messages to this client as read (best-effort, any coach). */
export async function markClientThreadRead(clientId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .neq("kind", "client")
    .is("read_at", null);
}

/** Mark the other side's messages in this thread as read (best-effort). */
export async function markThreadRead(coachId: string, clientId: string, readerIsCoach: boolean): Promise<void> {
  const supabase = await createClient();
  // The reader clears messages the *other* participant sent.
  const senderKind = readerIsCoach ? "client" : "coach";
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .eq("kind", senderKind)
    .is("read_at", null);
}

/**
 * The coach's thread list — one row per client, newest activity first, with an
 * unread count of client messages. Batched: pull this coach's messages once and
 * fold them per client.
 */
export async function getThreads(coachId: string, clientIds: { id: string; name: string }[]): Promise<ThreadSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("client_id,body,kind,read_at,created_at")
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });
  const rows = data ?? [];

  const last = new Map<string, { body: string; at: string; kind: Message["kind"] }>();
  const unread = new Map<string, number>();
  for (const r of rows) {
    if (!last.has(r.client_id)) last.set(r.client_id, { body: r.body, at: r.created_at, kind: r.kind as Message["kind"] });
    if (r.kind === "client" && r.read_at == null) unread.set(r.client_id, (unread.get(r.client_id) ?? 0) + 1);
  }

  const summaries: ThreadSummary[] = clientIds.map((c) => {
    const l = last.get(c.id);
    return {
      clientId: c.id,
      clientName: c.name,
      lastBody: l?.body ?? null,
      lastAt: l?.at ?? null,
      lastKind: l?.kind ?? null,
      unread: unread.get(c.id) ?? 0,
    };
  });

  // Threads with activity first (newest), then the rest alphabetically.
  summaries.sort((a, b) => {
    if (a.lastAt && b.lastAt) return b.lastAt.localeCompare(a.lastAt);
    if (a.lastAt) return -1;
    if (b.lastAt) return 1;
    return a.clientName.localeCompare(b.clientName);
  });
  return summaries;
}

/** Count of unread client messages across all of a coach's threads (nav badge). */
export async function getCoachUnreadCount(coachId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", coachId)
    .eq("kind", "client")
    .is("read_at", null);
  return count ?? 0;
}

/** Count of unread coach/nudge messages for a client (nav badge). */
export async function getClientUnreadCount(clientId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .neq("kind", "client")
    .is("read_at", null);
  return count ?? 0;
}
