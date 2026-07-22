"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { RANGE_OPTIONS } from "@/lib/charts/series";

/**
 * Time-range toggle for the graphs (7 / 30 / 90 days). URL-driven so the server
 * components refetch the right window — shareable, back-button friendly, and no
 * client-side data fetching. Soft-navigates without scrolling to the top.
 */
export function RangeToggle({ current }: { current: number }) {
  const pathname = usePathname();
  const params = useSearchParams();

  const hrefFor = (r: number) => {
    const p = new URLSearchParams(params.toString());
    p.set("range", String(r));
    return `${pathname}?${p.toString()}`;
  };

  return (
    <div className="flex gap-1" role="group" aria-label="Time range">
      {RANGE_OPTIONS.map((r) => {
        const active = current === r;
        return (
          <Link
            key={r}
            href={hrefFor(r)}
            scroll={false}
            aria-current={active ? "true" : undefined}
            className={`min-h-tap border px-2.5 font-label text-[11px] uppercase tracking-wide leading-[2.4] transition-colors ${
              active ? "border-red bg-red text-surface" : "border-hairline bg-surface text-ink/60 hover:border-ink"
            }`}
          >
            {r}d
          </Link>
        );
      })}
    </div>
  );
}
