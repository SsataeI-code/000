import { handPortions, type HandTargets } from "@/lib/nutrition/hand-portions";

const ROWS: { key: keyof ReturnType<typeof handPortions>; hand: string; macro: string; note: string }[] = [
  { key: "palms", hand: "Palm", macro: "Protein", note: "chicken, fish, eggs, yogurt, tofu" },
  { key: "cupped", hand: "Cupped hand", macro: "Carbs", note: "rice, oats, potato, fruit" },
  { key: "thumbs", hand: "Thumb", macro: "Fats", note: "oils, nuts, butter, cheese" },
];

/**
 * Hand-portion guidance (§B) — no scale needed. Turns the client's own targets
 * into a daily count of palms / cupped hands / thumbs, plus veggies by the fist.
 */
export function HandPortions({ targets }: { targets: HandTargets }) {
  const p = handPortions(targets);
  const counts = { palms: p.palms, cupped: p.cupped, thumbs: p.thumbs };

  return (
    <section aria-label="Hand portions" className="flex flex-col gap-3 border border-hairline bg-surface p-5">
      <div>
        <h2 className="text-2xl text-ink">No scale? Use your hand</h2>
        <p className="mt-1 font-body text-sm text-ink/60">
          A simple way to hit your targets without weighing anything — aim for roughly this across your day.
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-hairline">
        {ROWS.map((r) => (
          <li key={r.key} className="flex items-center gap-3 py-3">
            <span className="w-10 shrink-0 font-display text-3xl text-red">{counts[r.key]}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-body text-base text-ink">
                {counts[r.key] === 1 ? r.hand : `${r.hand}s`} of {r.macro.toLowerCase()}
              </span>
              <span className="block font-body text-xs text-ink/50">{r.note}</span>
            </span>
          </li>
        ))}
        <li className="flex items-center gap-3 py-3">
          <span className="w-10 shrink-0 font-display text-3xl text-ink/70">2–4</span>
          <span className="min-w-0 flex-1">
            <span className="block font-body text-base text-ink">Fists of veggies</span>
            <span className="block font-body text-xs text-ink/50">fill the rest of the plate — the more color, the better</span>
          </span>
        </li>
      </ul>

      <p className="font-body text-xs text-ink/40">
        A rough guide from your own targets, not an exact count. Your palm ≈ a protein serving, cupped hand ≈ carbs, thumb ≈ fats.
      </p>
    </section>
  );
}
