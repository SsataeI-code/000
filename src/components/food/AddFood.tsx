"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BarcodeScanner } from "@/components/food/BarcodeScanner";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { lookupProductAction, logFoodAction } from "@/lib/food/actions";
import { macrosForGrams, type NormalizedFood } from "@/lib/food/off";

type Mode = "choose" | "scanning" | "confirm";

interface Draft {
  name: string;
  brand: string;
  barcode: string | null;
  grams: string; // kept as string for the input
  per100g: NormalizedFood["per100g"] | null;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  source: "scan" | "manual";
  note?: string;
}

const emptyDraft: Draft = {
  name: "",
  brand: "",
  barcode: null,
  grams: "",
  per100g: null,
  calories: "",
  proteinG: "",
  carbsG: "",
  fatG: "",
  source: "manual",
};

function draftFromProduct(product: NormalizedFood): Draft {
  const grams = product.servingSizeG ?? 100;
  const m = macrosForGrams(product.per100g, grams);
  return {
    name: product.name ?? "",
    brand: product.brand ?? "",
    barcode: product.barcode,
    grams: String(grams),
    per100g: product.per100g,
    calories: String(m.calories),
    proteinG: String(m.proteinG),
    carbsG: String(m.carbsG),
    fatG: String(m.fatG),
    source: "scan",
    note: product.missing.length ? "Some values were missing — fill them in and it saves back for everyone." : undefined,
  };
}

export function AddFood() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [saving, startSave] = useTransition();

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

  // Re-derive macros from per-100g when the amount changes (scanned items only).
  function setGrams(value: string) {
    setDraft((d) => {
      if (!d.per100g) return { ...d, grams: value };
      const g = Number(value);
      if (!Number.isFinite(g) || g <= 0) return { ...d, grams: value };
      const m = macrosForGrams(d.per100g, g);
      return {
        ...d,
        grams: value,
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
      const res = await logFoodAction({
        name: draft.name,
        brand: draft.brand || null,
        barcode: draft.barcode,
        grams: draft.grams ? Number(draft.grams) : null,
        calories: Number(draft.calories) || 0,
        proteinG: Number(draft.proteinG) || 0,
        carbsG: Number(draft.carbsG) || 0,
        fatG: Number(draft.fatG) || 0,
        source: draft.source,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/client");
    });
  }

  if (mode === "choose") {
    return (
      <div className="flex flex-col gap-4">
        <Button onClick={() => setMode("scanning")}>Scan a barcode</Button>
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
        <p className="border border-hairline bg-surface px-3 py-2 font-body text-sm text-ink/70">
          {draft.note}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">
          {error}
        </p>
      ) : null}

      <Field label="Food name" name="name" value={draft.name} onChange={(e) => update("name", e.target.value)} required />
      <Field label="Brand (optional)" name="brand" value={draft.brand} onChange={(e) => update("brand", e.target.value)} />
      <Field
        label="Amount eaten (grams)"
        name="grams"
        type="number"
        inputMode="decimal"
        value={draft.grams}
        onChange={(e) => setGrams(e.target.value)}
        hint={draft.per100g ? "Change this and the macros update automatically." : undefined}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Calories" name="calories" type="number" inputMode="numeric" value={draft.calories} onChange={(e) => update("calories", e.target.value)} />
        <Field label="Protein (g)" name="protein" type="number" inputMode="decimal" value={draft.proteinG} onChange={(e) => update("proteinG", e.target.value)} />
        <Field label="Carbs (g)" name="carbs" type="number" inputMode="decimal" value={draft.carbsG} onChange={(e) => update("carbsG", e.target.value)} />
        <Field label="Fat (g)" name="fat" type="number" inputMode="decimal" value={draft.fatG} onChange={(e) => update("fatG", e.target.value)} />
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Log it"}
      </Button>
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
