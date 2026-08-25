"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface TabItem {
  href: string;
  label: string;
  icon: ReactNode;
}

/**
 * Flat mobile bottom tab bar (§4). Fixed on small screens, hidden ≥780px where
 * a side rail takes over. 44px targets, visible active state, keyboard reachable.
 */
export function BottomTabBar({ items }: { items: TabItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-hairline bg-surface/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              "relative flex min-h-tap flex-1 flex-col items-center justify-center gap-1 py-2 " +
              "font-label text-[10px] uppercase tracking-wide transition-colors " +
              (active ? "text-red" : "text-ink/55 hover:text-ink")
            }
          >
            {/* Active indicator — a crisp red bar at the top of the tab. */}
            <span
              aria-hidden
              className={`absolute inset-x-4 top-0 h-0.5 rounded-full bg-red transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
            />
            <span aria-hidden className={`h-5 w-5 transition-transform ${active ? "-translate-y-px scale-105" : ""}`}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
