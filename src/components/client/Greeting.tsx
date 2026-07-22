"use client";

import { useEffect, useState } from "react";

/**
 * A warm, time-aware hello (§5 "a living screen that shifts morning → midday →
 * evening"). Computed on the client so it follows the person's own clock, not
 * the server's. Falls back to a neutral greeting before hydration.
 */
function partOfDay(h: number): string {
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Winding down";
}

export function Greeting({ name, fallback }: { name?: string; fallback: string }) {
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    const g = partOfDay(new Date().getHours());
    setGreeting(name ? `${g}, ${name}.` : `${g}.`);
  }, [name]);

  return <h1 className="mt-1 text-4xl text-ink">{greeting ?? fallback}</h1>;
}
