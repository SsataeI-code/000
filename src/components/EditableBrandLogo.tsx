"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { createClient } from "@/lib/supabase/client";
import { saveImageOverrideAction } from "@/lib/content/actions";

/**
 * Brand logo that a coach/owner can change with a single click, right where it
 * shows in the header (owner request — no buried CMS pathway). Non-staff viewers
 * just see the logo. A click opens a file picker, uploads to the public
 * content-images bucket, saves the "brand.logo" override, and refreshes so the
 * new mark appears app-wide. Falls back to the built-in default when unset.
 */
export function EditableBrandLogo({
  src,
  size = 28,
  editable = false,
}: {
  src: string | null;
  size?: number;
  editable?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editable) return <BrandMark size={size} src={src} />;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const path = `brand.logo/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("content-images")
        .upload(path, file, { contentType: file.type || "image/png", upsert: false });
      if (upErr) {
        setError("Upload failed — make sure you're logged in as the coach.");
        return;
      }
      const { data: pub } = supabase.storage.from("content-images").getPublicUrl(path);
      const res = await saveImageOverrideAction("brand.logo", pub.publicUrl);
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

  return (
    <span className="relative inline-flex items-center">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="Change logo"
        aria-label="Change logo"
        className="group relative inline-flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-red disabled:opacity-60"
      >
        <BrandMark size={size} src={src} />
        {/* tiny pencil badge so it's obviously tappable */}
        <span
          aria-hidden
          className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-red text-white shadow-pop"
          style={{ fontSize: 9 }}
        >
          {busy ? "…" : "✎"}
        </span>
      </button>
      {error ? (
        <span role="alert" className="absolute left-0 top-full z-40 mt-1 w-56 rounded-md border border-red bg-surface px-2 py-1 text-[12px] text-red-ink shadow-card">
          {error}
        </span>
      ) : null}
    </span>
  );
}
