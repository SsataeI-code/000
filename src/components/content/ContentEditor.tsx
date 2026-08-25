"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveContentAction } from "@/lib/content/actions";

export interface ContentField {
  key: string;
  section: string;
  label: string;
  default: string;
  value: string; // current override, or "" when using the default
}

const SECTION_TITLES: Record<string, string> = {
  brand: "Brand",
  landing: "Landing page",
  auth: "Sign in & sign up",
  client: "Client app",
  coach: "Coach app",
  common: "Common",
};

/**
 * Owner CMS editor (§4). Every user-facing string, grouped by area, with its
 * house-style default as the placeholder. Editing overrides it app-wide;
 * clearing a field resets it to the default. Nothing is ever hard-coded — this
 * is the surface that proves it.
 */
export function ContentEditor({ fields }: { fields: ContentField[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map((f) => [f.key, f.value])),
  );
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sections = useMemo(() => {
    const map = new Map<string, ContentField[]>();
    for (const f of fields) {
      const list = map.get(f.section) ?? [];
      list.push(f);
      map.set(f.section, list);
    }
    return Array.from(map.entries());
  }, [fields]);

  const dirty = useMemo(
    () => fields.some((f) => (values[f.key] ?? "") !== f.value),
    [fields, values],
  );

  function save() {
    setError(null);
    setStatus(null);
    const edits = fields.map((f) => ({ key: f.key, value: values[f.key] ?? "" }));
    start(async () => {
      const res = await saveContentAction(edits);
      if (res.error) setError(res.error);
      else {
        setStatus("Saved — your words are live.");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {sections.map(([section, list]) => (
        <section key={section} className="flex flex-col gap-3">
          <h2 className="text-2xl text-ink">{SECTION_TITLES[section] ?? section}</h2>
          <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline bg-surface">
            {list.map((f) => {
              const overridden = (values[f.key] ?? "") !== "" && (values[f.key] ?? "") !== f.default;
              return (
                <li key={f.key} className="flex flex-col gap-1.5 p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor={f.key} className="font-label text-[11px] uppercase tracking-wide text-ink/60">
                      {f.label}
                    </label>
                    {overridden ? (
                      <button
                        type="button"
                        onClick={() => setValues((v) => ({ ...v, [f.key]: "" }))}
                        className="min-h-tap font-label text-[10px] uppercase tracking-wide text-ink/50 hover:text-red"
                      >
                        Reset
                      </button>
                    ) : (
                      <span className="font-label text-[10px] uppercase tracking-wide text-ink/30">Default</span>
                    )}
                  </div>
                  <textarea
                    id={f.key}
                    rows={f.default.length > 60 ? 2 : 1}
                    value={values[f.key] ?? ""}
                    placeholder={f.default}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    className="min-h-tap w-full resize-y rounded-lg border border-hairline bg-surface-muted px-3 py-2 font-body text-sm text-ink placeholder:text-ink/40 focus:border-ink"
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {/* Sticky save bar */}
      <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-lg border border-hairline bg-elevated p-3 md:bottom-4">
        <span aria-live="polite" className="font-body text-xs text-white/80">
          {error ? <span className="text-red-ink">{error}</span> : status ? status : dirty ? "Unsaved changes" : "All saved"}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="min-h-tap shrink-0 bg-red px-5 py-2 font-label text-xs font-600 uppercase tracking-wide text-white hover:bg-red-ink disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save copy"}
        </button>
      </div>
    </div>
  );
}
