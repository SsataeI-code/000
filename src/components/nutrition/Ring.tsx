"use client";

import { useEffect, useState } from "react";

/**
 * Progress ring that animates its fill to the value on mount (§4 "progress fills
 * that animate to value"). Reduced-motion users get the final value instantly —
 * the CSS transition is neutralized globally by the prefers-reduced-motion rule.
 */
export function Ring({
  value,
  target,
  label,
  unit,
  size = 168,
  stroke = 14,
}: {
  value: number;
  target: number;
  label: string;
  unit: string;
  size?: number;
  stroke?: number;
}) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const over = target > 0 && value > target;

  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - shown);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ececea" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? "#e10600" : "#0c0c0d"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center text-center">
        <span className="font-display text-3xl leading-none text-ink">{Math.round(value)}</span>
        <span className="font-label text-[10px] uppercase tracking-wide text-ink/50">
          / {Math.round(target)} {unit}
        </span>
        <span className="mt-1 font-label text-[10px] uppercase tracking-wide text-ink/40">{label}</span>
      </div>
    </div>
  );
}
