"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { draftCoachMessageAction } from "@/lib/ai/actions";
import type { Message } from "@/lib/types/db";
import type { SendState } from "@/lib/messages/actions";

const initialState: SendState = {};

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" }) +
        " " +
        d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * A live coach↔client thread (§10). Seeds from the server, then subscribes to
 * Supabase Realtime so new messages appear without a refresh. Auto-nudges (kind
 * "nudge") are clearly labeled as the app; coach messages carry the coach's
 * name — real messages read as real (§10 transparency).
 */
export function ChatThread({
  coachId,
  clientId,
  viewerId,
  viewerIsCoach,
  coachName,
  action,
  initialMessages,
  placeholder = "Write a message…",
  canDraft = false,
  aiEnabled = false,
}: {
  coachId: string;
  clientId: string;
  viewerId: string;
  viewerIsCoach: boolean;
  coachName: string;
  action: (prev: SendState, formData: FormData) => Promise<SendState>;
  initialMessages: Message[];
  placeholder?: string;
  /** Coach thread: show the "Draft with AI" helper (§11 AI drafts; coach sends). */
  canDraft?: boolean;
  aiEnabled?: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [body, setBody] = useState("");
  const [drafting, startDraft] = useTransition();
  const [draftError, setDraftError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Clear the box and refresh server data (unread counts) after a successful send.
  useEffect(() => {
    if (state.ok) {
      setBody("");
      router.refresh();
    }
  }, [state, router]);

  // Re-sync when the server sends fresh data (after router.refresh()), merging it
  // with anything Realtime already appended — deduped by id, ordered by time. This
  // is what makes a sent message appear even when Realtime isn't delivering: the
  // refresh brings it back through initialMessages instead of vanishing (§2/§10).
  useEffect(() => {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const m of initialMessages) byId.set(m.id, m);
      return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
  }, [initialMessages]);

  function draft() {
    setDraftError(null);
    startDraft(async () => {
      const res = await draftCoachMessageAction(clientId, body);
      if (res.error) setDraftError(res.error);
      else if (res.reply) setBody(res.reply);
    });
  }

  // Live subscription to this thread.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`thread:${coachId}:${clientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `client_id=eq.${clientId}` },
        (payload) => {
          const m = payload.new as Message;
          if (m.coach_id !== coachId) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          router.refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [coachId, clientId, router]);

  // Keep the newest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto rounded-lg border border-hairline bg-surface p-4">
        {messages.length === 0 ? (
          <li className="py-8 text-center font-body text-sm text-ink/50">
            No messages yet. Say hello — this is your private line.
          </li>
        ) : (
          messages.map((m) => <Bubble key={m.id} m={m} mine={m.sender_id === viewerId} viewerIsCoach={viewerIsCoach} coachName={coachName} />)
        )}
        <div ref={endRef} />
      </ol>

      <form ref={formRef} action={formAction} className="flex flex-col gap-2">
        {state.error ? (
          <p role="alert" className="rounded-lg border border-red bg-surface px-3 py-2 text-sm text-red-ink">{state.error}</p>
        ) : null}
        {draftError ? (
          <p role="alert" className="rounded-lg border border-red bg-surface px-3 py-2 text-sm text-red-ink">{draftError}</p>
        ) : null}
        <div className="flex items-end gap-2">
          <label htmlFor="body" className="sr-only">Message</label>
          <textarea
            id="body"
            name="body"
            rows={2}
            required
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={placeholder}
            className="min-h-tap flex-1 resize-none rounded-lg border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink placeholder:text-ink/40 focus:border-ink"
          />
          <button
            type="submit"
            disabled={pending}
            className="min-h-tap shrink-0 bg-red px-4 py-2.5 font-label text-xs font-600 uppercase tracking-wide text-white hover:bg-red-ink disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send"}
          </button>
        </div>
        {canDraft && aiEnabled ? (
          <button
            type="button"
            onClick={draft}
            disabled={drafting}
            className="min-h-tap self-start border border-ink px-3 py-1.5 font-label text-[11px] uppercase tracking-wide text-ink hover:border-red hover:text-red disabled:opacity-50"
          >
            {drafting ? "Drafting…" : body.trim() ? "Redraft with AI" : "Draft with AI"}
          </button>
        ) : null}
      </form>
    </div>
  );
}

function Bubble({ m, mine, viewerIsCoach, coachName }: { m: Message; mine: boolean; viewerIsCoach: boolean; coachName: string }) {
  const isNudge = m.kind === "nudge";
  // Who to name above the bubble (only for messages the viewer didn't send).
  const from = isNudge ? "Auto-nudge" : m.kind === "coach" ? (viewerIsCoach ? "You" : coachName) : viewerIsCoach ? "Client" : "You";

  return (
    <li className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      {!mine ? (
        <span className="mb-0.5 font-label text-[10px] uppercase tracking-wide text-ink/45">
          {from}{isNudge ? " · from the app" : ""}
        </span>
      ) : null}
      <div
        className={`max-w-[85%] border px-3 py-2 font-body text-sm ${
          mine
            ? "border-ink bg-elevated text-white"
            : isNudge
              ? "border-hairline bg-surface-muted text-ink/80"
              : "border-hairline bg-surface text-ink"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{m.body}</p>
      </div>
      <span className="mt-0.5 font-body text-[10px] text-ink/40">{timeLabel(m.created_at)}</span>
    </li>
  );
}
