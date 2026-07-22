"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { RANGE_OPTIONS, RANGE_COOKIE } from "@/lib/charts/series";

/**
 * Time-range toggle for the graphs (7 / 30 / 60 / 90 days). URL-driven so the
 * server components refetch the right window — shareable, back-button friendly,
 * no client-side data fetching — and it writes a cookie on pick so the choice
 * sticks the next time the coach or client opens a graph screen.
 */
export function RangeToggle({ current }: { current: number }) {
  const pathname = usePathname();
  const params = useSearchParams();

  const hrefFor = (r: number) => {
    const p = new URLSearchParams(params.toString());
    p.set("range", String(r));
    return `${pathname}?${p.toString()}`;
  };

  const remember = (r: number) => {
    document.cookie = `${RANGE_COOKIE}=${r};path=/;max-age=31536000;samesite=lax`;
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
            onClick={() => remember(r)}
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
