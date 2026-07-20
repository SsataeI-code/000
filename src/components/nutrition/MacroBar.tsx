"use client";

import { useEffect, useState } from "react";

/** A labeled macro progress bar (protein / carbs / fat), animating to value. */
export function MacroBar({
  label,
  value,
  target,
  unit = "g",
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
}) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const over = target > 0 && value > target;

  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="font-label text-xs uppercase tracking-wide text-ink/70">{label}</span>
        <span className="font-body text-xs text-ink/60">
          {Math.round(value)} / {Math.round(target)}
          {unit}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden bg-hairline">
        <div
          className="h-full"
          style={{
            width: `${shown * 100}%`,
            background: over ? "#e10600" : "#1f8a4c",
            transition: "width 700ms cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </div>
    </div>
  );
}
