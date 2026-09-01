"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BarcodeScanner } from "@/components/food/BarcodeScanner";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { lookupProductAction, logFoodAction, searchFoodsAction } from "@/lib/food/actions";
import { macrosForGrams, type NormalizedFood } from "@/lib/food/off";
import { createClient } from "@/lib/supabase/client";
import { PORTION_OPTIONS, gramsForPortion, type PortionUnit } from "@/lib/food/portions";

type Mode = "choose" | "scanning" | "search" | "confirm";

interface Draft {
  name: string;
  brand: string;
  barcode: string | null;
  grams: string; // kept as string for the input
  servingSizeG: number | null;
  qty: string; // portion quantity
  unit: PortionUnit;
  per100g: NormalizedFood["per100g"] | null;
  micros100g?: Record<string, number>; // full per-100g nutriment map (micros)
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  /** Optional electrolytes/micros for THIS portion, in mg (keyed by nutriment). */
  microsMg: Record<string, string>;
  source: "scan" | "manual";
  note?: string;
}

// The micros a client can enter by hand (label + stored nutriment key), in mg.
const MICRO_INPUTS: { key: string; label: string }[] = [
  { key: "sodium", label: "Sodium" },
  { key: "potassium", label: "Potassium" },
  { key: "magnesium", label: "Magnesium" },
  { key: "chloride", label: "Chloride" },
  { key: "calcium", label: "Calcium" },
  { key: "iron", label: "Iron" },
  { key: "zinc", label: "Zinc" },
];
const emptyMicrosMg: Record<string, string> = {};

const emptyDraft: Draft = {
  name: "",
  brand: "",
  barcode: null,
  grams: "",
  servingSizeG: null,
  qty: "1",
  unit: "g",
  per100g: null,
  calories: "",
  proteinG: "",
  carbsG: "",
  fatG: "",
  microsMg: emptyMicrosMg,
  source: "manual",
};

function draftFromProduct(product: NormalizedFood): Draft {
  // Default to "1 serving" when we know the serving size — friendlier than grams.
  const hasServing = !!(product.servingSizeG && product.servingSizeG > 0);
  const unit: PortionUnit = hasServing ? "serving" : "g";
  const qty = hasServing ? 1 : product.servingSizeG ?? 100;
  const grams = gramsForPortion(qty, unit, product.servingSizeG);
  const m = macrosForGrams(product.per100g, grams);
  // Prefill the micro fields (mg) from any per-100g electrolyte data the scan had.
  const micros100 = product.nutrimentsPer100g ?? {};
  const microsMg: Record<string, string> = {};
  for (const { key } of MICRO_INPUTS) {
    const g100 = micros100[key];
    if (typeof g100 === "number" && g100 > 0 && grams > 0) {
      microsMg[key] = String(Math.round(g100 * (grams / 100) * 1000 * 10) / 10);
    }
  }
  return {
    name: product.name ?? "",
    brand: product.brand ?? "",
    barcode: product.barcode,
    grams: String(grams),
    servingSizeG: product.servingSizeG,
    qty: String(qty),
    unit,
    per100g: product.per100g,
    micros100g: product.nutrimentsPer100g,
    calories: String(m.calories),
    proteinG: String(m.proteinG),
    carbsG: String(m.carbsG),
    fatG: String(m.fatG),
    microsMg,
    source: "scan",
    note: product.missing.length ? "Some values were missing — fill them in and it saves back for everyone." : undefined,
  };
}

export function AddFood({ userId }: { userId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [saving, startSave] = useTransition();
  const [justLogged, setJustLogged] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);

  /** Upload the optional photo to the client's private folder; returns its path. */
  async function uploadPhoto(): Promise<string | null> {
    if (!photo) return null;
    try {
      const supabase = createClient();
      const ext = photo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("food-photos")
        .upload(path, photo, { contentType: photo.type || "image/jpeg", upsert: false });
      return upErr ? null : path; // a failed photo never blocks the log
    } catch {
      return null;
    }
  }

  // Name search state.
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NormalizedFood[]>([]);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  // Debounced OFF search as the client types (§6 text search).
  useEffect(() => {
    if (mode !== "search") return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      const found = await searchFoodsAction(q);
      // Ignore out-of-order responses (only the latest query wins).
      if (seq === searchSeq.current) {
        setResults(found);
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, mode]);

  async function handleBarcode(code: string) {
    setLooking(true);
    setError(null);
    const res = await lookupProductAction(code);
    setLooking(false);
    if (res.found) {
      setDraft(draftFromProduct(res.product));
    } else {
      // Not found / offline: still let them log it by hand, keeping the barcode.
      setDraft({
        ...emptyDraft,
        barcode: code,
        source: "scan",
        grams: "100",
        note:
          res.reason === "network_error"
            ? "Couldn't reach the food database — enter the details by hand."
            : "New to the database — add its details and you'll help everyone who scans it next.",
      });
    }
    setMode("confirm");
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  function updateMicro(key: string, value: string) {
    setDraft((d) => ({ ...d, microsMg: { ...d.microsMg, [key]: value } }));
  }

  // Re-derive grams + macros whenever the portion (quantity or unit) changes.
  function setPortion(qty: string, unit: PortionUnit) {
    setDraft((d) => {
      const grams = gramsForPortion(Number(qty) || 0, unit, d.servingSizeG);
      if (!d.per100g) return { ...d, qty, unit, grams: String(grams) };
      const m = macrosForGrams(d.per100g, grams);
      return {
        ...d,
        qty,
        unit,
        grams: String(grams),
        calories: String(m.calories),
        proteinG: String(m.proteinG),
        carbsG: String(m.carbsG),
        fatG: String(m.fatG),
      };
    });
  }

  function save() {
    setError(null);
    if (!draft.name.trim()) {
      setError("Give it a name first.");
      return;
    }
    startSave(async () => {
      const photoPath = await uploadPhoto();
      // Hand-entered micros are per-portion, in mg → store in grams (÷1000).
      const nutrimentsAbsolute: Record<string, number> = {};
      for (const { key } of MICRO_INPUTS) {
        const mg = Number(draft.microsMg[key]);
        if (Number.isFinite(mg) && mg > 0) nutrimentsAbsolute[key] = mg / 1000;
      }
      const res = await logFoodAction({
        name: draft.name,
        brand: draft.brand || null,
        barcode: draft.barcode,
        grams: draft.grams ? Number(draft.grams) : null,
        calories: Number(draft.calories) || 0,
        proteinG: Number(draft.proteinG) || 0,
        carbsG: Number(draft.carbsG) || 0,
        fatG: Number(draft.fatG) || 0,
        nutrimentsPer100g: draft.micros100g,
        nutrimentsAbsolute: Object.keys(nutrimentsAbsolute).length ? nutrimentsAbsolute : null,
        photoPath,
        source: draft.source,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setJustLogged(true);
      window.setTimeout(() => router.push("/client"), 850);
    });
  }

  if (mode === "choose") {
    return (
      <div className="flex flex-col gap-4">
        <Button onClick={() => setMode("scanning")}>Scan a barcode</Button>
        <Button
          variant="ghost"
          onClick={() => {
            setQuery("");
            setResults([]);
            setMode("search");
          }}
        >
          Search by name
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setDraft(emptyDraft);
            setMode("confirm");
          }}
        >
          Enter it manually
        </Button>
      </div>
    );
  }

  if (mode === "search") {
    return (
      <div className="flex flex-col gap-4">
        <Field
          label="Search foods"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. white bread"
          autoComplete="off"
          autoFocus
        />
        {searching ? <p className="font-body text-sm text-ink/60">Searching…</p> : null}
        {!searching && query.trim().length >= 2 && results.length === 0 ? (
          <p className="font-body text-sm text-ink/60">
            No matches. Try another wording, or enter it manually.
          </p>
        ) : null}

        <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline bg-surface">
          {results.map((r, i) => (
            <li key={`${r.barcode}-${i}`}>
              <button
                type="button"
                onClick={() => {
                  setDraft(draftFromProduct(r));
                  setMode("confirm");
                }}
                className="flex w-full min-h-tap flex-col items-start gap-0.5 px-4 py-3 text-left hover:bg-surface-muted"
              >
                <span className="font-body text-sm font-500 text-ink">{r.name}</span>
                <span className="font-body text-xs text-ink/50">
                  {r.per100g.calories != null ? `${Math.round(r.per100g.calories)} kcal / 100g` : ""}
                  {r.brand ? ` · ${r.brand}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setMode("choose")}
          className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red"
        >
          Back
        </button>
      </div>
    );
  }

  if (mode === "scanning") {
    return (
      <div className="flex flex-col gap-4">
        {looking ? (
          <p className="font-body text-sm text-ink/70">Looking it up…</p>
        ) : (
          <BarcodeScanner onDetected={handleBarcode} onClose={() => setMode("choose")} />
        )}
      </div>
    );
  }

  // confirm
  return (
    <div className="flex flex-col gap-5">
      {draft.note ? (
        <p className="rounded-lg border border-hairline bg-surface px-3 py-2 font-body text-sm text-ink/70">
          {draft.note}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-lg border border-red bg-surface px-3 py-2 text-sm text-red-ink">
          {error}
        </p>
      ) : null}

      <Field label="Food name" name="name" value={draft.name} onChange={(e) => update("name", e.target.value)} required />
      <Field label="Brand (optional)" name="brand" value={draft.brand} onChange={(e) => update("brand", e.target.value)} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="portion_qty" className="text-xs text-ink/80">How much did you eat?</label>
        <div className="flex gap-2">
          <input
            id="portion_qty"
            type="number"
            inputMode="decimal"
            step="0.25"
            min={0}
            value={draft.qty}
            onChange={(e) => setPortion(e.target.value, draft.unit)}
            aria-label="Amount"
            className="min-h-tap w-24 rounded-lg border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink focus:border-ink"
          />
          <select
            aria-label="Unit"
            value={draft.unit}
            onChange={(e) => setPortion(draft.qty, e.target.value as PortionUnit)}
            className="min-h-tap flex-1 rounded-lg border border-hairline bg-surface px-3 py-2.5 font-body text-base text-ink focus:border-ink"
          >
            {PORTION_OPTIONS.map((o) => (
              <option key={o.unit} value={o.unit}>{o.label}</option>
            ))}
          </select>
        </div>
        <p className="font-body text-xs text-ink/50">
          ≈ {draft.grams || 0} g{draft.per100g ? " · macros update automatically" : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Calories" name="calories" type="number" inputMode="numeric" value={draft.calories} onChange={(e) => update("calories", e.target.value)} />
        <Field label="Protein (g)" name="protein" type="number" inputMode="decimal" value={draft.proteinG} onChange={(e) => update("proteinG", e.target.value)} />
        <Field label="Carbs (g)" name="carbs" type="number" inputMode="decimal" value={draft.carbsG} onChange={(e) => update("carbsG", e.target.value)} />
        <Field label="Fat (g)" name="fat" type="number" inputMode="decimal" value={draft.fatG} onChange={(e) => update("fatG", e.target.value)} />
      </div>

      <details className="rounded-lg border border-hairline bg-surface">
        <summary className="flex min-h-tap cursor-pointer list-none items-center justify-between px-3 py-2.5">
          <span className="font-label text-xs uppercase tracking-wide text-ink/70">Electrolytes &amp; micros (optional)</span>
          <span className="font-label text-[10px] uppercase tracking-wide text-ink/40">mg · tap to add</span>
        </summary>
        <div className="grid grid-cols-2 gap-3 px-3 pb-1">
          {MICRO_INPUTS.map((mi) => (
            <label key={mi.key} className="flex flex-col gap-1 text-xs text-ink/80">
              {mi.label} (mg)
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={draft.microsMg[mi.key] ?? ""}
                onChange={(e) => updateMicro(mi.key, e.target.value)}
                className="min-h-tap rounded-lg border border-hairline bg-surface px-3 py-2 font-body text-base text-ink focus:border-ink"
              />
            </label>
          ))}
        </div>
        <p className="px-3 py-3 font-body text-[11px] text-ink/50">
          Enter what the label lists for this serving. Perfect for electrolyte drinks and supplements the scanner can&apos;t find.
        </p>
      </details>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="food_photo" className="text-xs text-ink/80">Add a photo (optional)</label>
        <input
          id="food_photo"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="min-h-tap w-full rounded-lg border border-hairline bg-surface px-3 py-2 font-body text-sm text-ink/70 file:mr-3 file:border-0 file:bg-elevated file:px-3 file:py-1.5 file:font-label file:text-xs file:uppercase file:text-white"
        />
        {photo ? <p className="font-body text-xs text-ink/50">{photo.name} attached</p> : null}
      </div>

      <div className="relative">
        {justLogged ? (
          <span aria-hidden className="animate-xp-burst pointer-events-none absolute -top-4 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-grad-success px-2.5 py-0.5 font-label text-[11px] font-600 uppercase tracking-wide text-white shadow-glow-success">
            Logged +15 XP
          </span>
        ) : null}
        <Button onClick={save} disabled={saving || justLogged}>
          {justLogged ? "Logged ✓" : saving ? "Saving…" : "Log it"}
        </Button>
      </div>
      <button
        type="button"
        onClick={() => setMode("choose")}
        className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red"
      >
        Back
      </button>
    </div>
  );
}
