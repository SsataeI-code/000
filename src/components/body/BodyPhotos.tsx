"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addBodyPhotoAction, deleteBodyPhotoAction } from "@/lib/body/actions";
import type { BodyPhotoView } from "@/lib/body/data";

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Progress photos (§C) — opt-in, private. `canEdit` (the client's own page) shows
 * upload + delete; read-only (the coach deep-dive) shows the gallery only. Photos
 * upload client-side to the client's private folder, then a server action saves
 * the path. A failed upload never corrupts anything.
 */
export function BodyPhotos({
  photos,
  canEdit,
  userId,
}: {
  photos: BodyPhotoView[];
  canEdit: boolean;
  userId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("body-photos")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
      if (upErr) {
        setError("Upload failed — try again.");
        return;
      }
      const res = await addBodyPhotoAction(path);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    } catch {
      setError("Upload failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    setBusy(true);
    try {
      await deleteBodyPhotoAction(id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Progress photos" className="flex flex-col gap-3 border border-hairline bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-2xl text-ink">Progress photos</h2>
        {canEdit ? (
          <span className="font-label text-[10px] uppercase tracking-wide text-ink/40">Private · only you & your coach</span>
        ) : null}
      </div>

      {canEdit ? (
        <p className="font-body text-sm text-ink/60">
          Optional. Add a photo whenever you like to see how far you&apos;ve come — kept private in your own encrypted
          folder.
        </p>
      ) : null}

      {error ? <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">{error}</p> : null}

      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <li key={p.id} className="flex flex-col gap-1">
              <div className="aspect-square overflow-hidden border border-hairline bg-surface-muted">
                {p.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt={`Progress photo from ${fmt(p.taken_on)}`} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center font-body text-xs text-ink/40">Unavailable</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-body text-xs text-ink/50">{fmt(p.taken_on)}</span>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => onDelete(p.id)}
                    disabled={busy}
                    className="min-h-tap font-label text-[10px] uppercase tracking-wide text-ink/50 underline underline-offset-4 hover:text-red disabled:opacity-50"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-body text-sm text-ink/50">
          {canEdit ? "No photos yet." : "No progress photos yet."}
        </p>
      )}

      {canEdit ? (
        <div>
          <input
            ref={inputRef}
            id="body-photo-input"
            type="file"
            accept="image/*"
            onChange={onPick}
            disabled={busy}
            className="sr-only"
          />
          <label
            htmlFor="body-photo-input"
            className={`inline-flex min-h-tap cursor-pointer items-center border border-hairline bg-surface px-4 py-2 font-label text-xs uppercase tracking-wide text-ink hover:border-red hover:text-red ${busy ? "opacity-50" : ""}`}
          >
            {busy ? "Uploading…" : "Add a photo"}
          </label>
        </div>
      ) : null}
    </section>
  );
}
