"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addJournalEntryAction, deleteJournalEntryAction } from "@/lib/journal/actions";
import type { JournalEntryView } from "@/lib/journal/data";

const MOODS = [
  { v: 1, label: "Rough" },
  { v: 2, label: "Meh" },
  { v: 3, label: "OK" },
  { v: 4, label: "Good" },
  { v: 5, label: "Great" },
];

function fmt(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/**
 * Journal / food diary. `canEdit` (the client's own page) shows the composer +
 * delete; read-only (the coach deep-dive) shows entries only. Photos upload
 * client-side to the client's private folder, then a server action saves the
 * entry — a failed upload never blocks the note.
 */
export function Journal({ entries, canEdit, userId }: { entries: JournalEntryView[]; canEdit: boolean; userId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!body.trim() && !file) {
      setError("Write something or add a photo.");
      return;
    }
    setBusy(true);
    try {
      let storagePath: string | null = null;
      if (file) {
        const supabase = createClient();
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("journal-photos")
          .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
        if (upErr) {
          setError("Photo upload failed — try again.");
          setBusy(false);
          return;
        }
        storagePath = path;
      }
      const res = await addJournalEntryAction({ body, mood, storagePath });
      if (res.error) {
        setError(res.error);
        setBusy(false);
        return;
      }
      setBody("");
      setMood(null);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      setError("Couldn't save — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    await deleteJournalEntryAction(id);
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-5">
      {canEdit ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface shadow-card p-5">
          <div>
            <h2 className="text-2xl text-ink">New entry</h2>
            <p className="mt-0.5 font-body text-sm text-ink/60">Snap what you ate or jot how the day went. Your coach can see it.</p>
          </div>
          <textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What did you eat? How are you feeling?"
            className="w-full resize-none rounded-lg border border-hairline bg-surface-input px-3.5 py-2.5 font-body text-base text-ink placeholder:text-ink/40 outline-none focus:border-red focus:ring-2 focus:ring-red/30"
          />

          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m.v}
                type="button"
                onClick={() => setMood((cur) => (cur === m.v ? null : m.v))}
                aria-pressed={mood === m.v}
                className={`min-h-tap rounded-full border px-3.5 py-1.5 font-label text-[11px] font-600 uppercase tracking-wide transition-transform active:scale-95 ${
                  mood === m.v ? "border-transparent bg-grad-red text-white shadow-glow" : "border-hairline bg-surface-input text-ink/70 hover:border-red"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="journal_photo" className="text-xs text-ink/80">Add a food photo (optional)</label>
            <input
              id="journal_photo"
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="min-h-tap w-full rounded-lg border border-hairline bg-surface-input px-3 py-2 font-body text-sm text-ink/70 file:mr-3 file:rounded-full file:border-0 file:bg-grad-red file:px-3 file:py-1.5 file:font-label file:text-xs file:uppercase file:text-white"
            />
            {file ? <p className="font-body text-xs text-ink/50">{file.name} attached</p> : null}
          </div>

          {error ? <p role="alert" className="rounded-lg border border-red bg-surface px-3 py-2 text-sm text-red-ink">{error}</p> : null}

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="min-h-tap rounded-xl bg-grad-red px-5 py-3 font-label text-sm font-600 uppercase tracking-wide text-white shadow-pop-red transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-60"
          >
            {busy ? "Saving…" : "Add to journal"}
          </button>
        </section>
      ) : null}

      {entries.length === 0 ? (
        <p className="rounded-2xl border border-hairline bg-surface shadow-card p-5 font-body text-sm text-ink/60">
          {canEdit ? "No entries yet — add your first above." : "No journal entries yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((e) => (
            <li key={e.id} className="overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card">
              {e.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.url} alt="Journal photo" className="max-h-72 w-full object-cover" />
              ) : null}
              <div className="flex flex-col gap-1.5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-label text-[11px] uppercase tracking-wide text-ink/50">{fmt(e.entry_date)}</span>
                  <span className="flex items-center gap-3">
                    {e.mood ? <span className="font-label text-[11px] uppercase tracking-wide text-red">{MOODS.find((m) => m.v === e.mood)?.label}</span> : null}
                    {canEdit ? (
                      <button type="button" onClick={() => remove(e.id)} disabled={busy} className="min-h-tap font-label text-[10px] uppercase tracking-wide text-ink/40 underline underline-offset-4 hover:text-red disabled:opacity-50">
                        Delete
                      </button>
                    ) : null}
                  </span>
                </div>
                {e.body ? <p className="whitespace-pre-wrap break-words font-body text-sm text-ink/85">{e.body}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
