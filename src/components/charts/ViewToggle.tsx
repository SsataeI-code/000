"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { VIEW_OPTIONS, VIEW_COOKIE, type ChartView } from "@/lib/charts/series";

/** Weekly / Daily granularity toggle — URL-driven so the server refetches. */
export function ViewToggle({ current }: { current: ChartView }) {
  const pathname = usePathname();
  const params = useSearchParams();

  const hrefFor = (v: ChartView) => {
    const p = new URLSearchParams(params.toString());
    p.set("view", v);
    return `${pathname}?${p.toString()}`;
  };
  const remember = (v: ChartView) => {
    document.cookie = `${VIEW_COOKIE}=${v};path=/;max-age=31536000;samesite=lax`;
  };

  return (
    <div className="flex gap-1" role="group" aria-label="Chart detail">
      {VIEW_OPTIONS.map((v) => {
        const active = current === v;
        return (
          <Link
            key={v}
            href={hrefFor(v)}
            scroll={false}
            onClick={() => remember(v)}
            aria-current={active ? "true" : undefined}
            className={`min-h-tap border px-2.5 font-label text-[11px] uppercase tracking-wide leading-[2.4] transition-colors ${
              active ? "border-red bg-red text-white" : "border-hairline bg-surface text-ink/60 hover:border-ink"
            }`}
          >
            {v}
          </Link>
        );
      })}
    </div>
  );
}
