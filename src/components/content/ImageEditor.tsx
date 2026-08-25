"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CONTENT_IMAGES, type ImageKey, type ImageOverrides } from "@/lib/content/images";
import { saveImageOverrideAction, resetImageOverrideAction } from "@/lib/content/actions";

/**
 * Owner editor for CMS images (§4). Each image: a live preview (current override
 * or a "default" note), upload to replace, and reset to the built-in default.
 * Uploads go client-side to the public content-images bucket; the public URL is
 * saved as an override.
 */
export function ImageEditor({ overrides }: { overrides: ImageOverrides }) {
  return (
    <div className="flex flex-col gap-4">
      {CONTENT_IMAGES.map((img) => (
        <ImageRow key={img.key} imgKey={img.key} label={img.label} description={img.description} current={overrides[img.key] ?? null} />
      ))}
    </div>
  );
}

function ImageRow({
  imgKey,
  label,
  description,
  current,
}: {
  imgKey: ImageKey;
  label: string;
  description: string;
  current: string | null;
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
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const path = `${imgKey}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("content-images")
        .upload(path, file, { contentType: file.type || "image/png", upsert: false });
      if (upErr) {
        setError("Upload failed — try again.");
        return;
      }
      const { data: pub } = supabase.storage.from("content-images").getPublicUrl(path);
      const res = await saveImageOverrideAction(imgKey, pub.publicUrl);
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

  async function onReset() {
    setBusy(true);
    setError(null);
    try {
      const res = await resetImageOverrideAction(imgKey);
      if (res.error) setError(res.error);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border border-hairline bg-surface p-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface-muted">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt={`${label} (current)`} className="h-full w-full object-contain" />
        ) : (
          <span className="font-label text-[9px] uppercase tracking-wide text-ink/40">Default</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-body text-base text-ink">{label}</p>
        <p className="font-body text-xs text-ink/50">{description}</p>
        {error ? <p role="alert" className="mt-1 font-body text-xs text-red-ink">{error}</p> : null}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <input ref={inputRef} id={`img-${imgKey}`} type="file" accept="image/*" onChange={onPick} disabled={busy} className="sr-only" />
        <label
          htmlFor={`img-${imgKey}`}
          className={`inline-flex min-h-tap cursor-pointer items-center rounded-lg border border-hairline bg-surface px-4 py-2 font-label text-xs uppercase tracking-wide text-ink hover:border-red hover:text-red ${busy ? "opacity-50" : ""}`}
        >
          {busy ? "Working…" : current ? "Replace" : "Upload"}
        </label>
        {current ? (
          <button
            type="button"
            onClick={onReset}
            disabled={busy}
            className="min-h-tap font-label text-[10px] uppercase tracking-wide text-ink/50 underline underline-offset-4 hover:text-red disabled:opacity-50"
          >
            Reset to default
          </button>
        ) : null}
      </div>
    </div>
  );
}
