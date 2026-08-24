/**
 * Flat food icons for the plate builder — simple, recognizable vector glyphs
 * (§4 "icons only, no decorative emoji"; no gradients, no photos). Each renders
 * on the dark surfaces at any size. Unknown keys fall back to a neutral dot so a
 * new food never breaks the layout.
 */

const P: Record<string, React.ReactNode> = {
  // Protein
  drumstick: (
    <>
      <circle cx="9" cy="9" r="5.5" fill="#c9744b" />
      <rect x="12" y="12" width="8.5" height="3" rx="1.5" transform="rotate(45 12 12)" fill="#e8d8c3" />
    </>
  ),
  steak: (
    <>
      <path d="M4 12c0-4 4-6 8-6s8 1 8 5-4 7-9 7-7-2-7-6Z" fill="#b64b52" />
      <path d="M8 11c2-1 6-1 8 0" stroke="#e8c9cb" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  ),
  fish: (
    <>
      <path d="M3 12c3-4 9-4 13 0-4 4-10 4-13 0Z" fill="#5aa9c9" />
      <path d="M16 12l5-3v6l-5-3Z" fill="#5aa9c9" />
      <circle cx="7" cy="11" r="1" fill="#0c0c0d" />
    </>
  ),
  egg: (
    <>
      <ellipse cx="12" cy="13" rx="8" ry="6" fill="#f4f4f2" />
      <circle cx="12" cy="12" r="3.2" fill="#f2b705" />
    </>
  ),
  cup: (
    <>
      <path d="M6 7h12l-1.2 11a1.5 1.5 0 0 1-1.5 1.3H8.7a1.5 1.5 0 0 1-1.5-1.3L6 7Z" fill="#e9e4dc" />
      <rect x="5" y="5" width="14" height="2.6" rx="1.3" fill="#cfc7bb" />
    </>
  ),
  cube: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z" fill="#f0ead8" />
      <path d="M12 3l8 4.5L12 12 4 7.5 12 3Z" fill="#e2d9bf" />
    </>
  ),
  beans: (
    <>
      <ellipse cx="9" cy="10" rx="4" ry="2.6" transform="rotate(-25 9 10)" fill="#a8703c" />
      <ellipse cx="14" cy="14" rx="4" ry="2.6" transform="rotate(-25 14 14)" fill="#c98a4b" />
    </>
  ),
  // Carbs
  bowl: (
    <>
      <path d="M3 11h18c0 5-4 8-9 8s-9-3-9-8Z" fill="#e9e4dc" />
      <path d="M6 10.5c1.2-1.2 3-1.6 4-.6M11 9.5c1-1 2.6-1 3.6 0" stroke="#cbbfa8" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  ),
  potato: (
    <>
      <ellipse cx="12" cy="12" rx="8.5" ry="6" transform="rotate(-20 12 12)" fill="#c79a5b" />
      <circle cx="9" cy="11" r="0.9" fill="#8a6636" />
      <circle cx="14" cy="13" r="0.9" fill="#8a6636" />
    </>
  ),
  bread: (
    <>
      <path d="M5 9c0-2.5 3-4 7-4s7 1.5 7 4v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9Z" fill="#d9a760" />
      <path d="M5 9h14" stroke="#b9843f" strokeWidth="1.2" />
    </>
  ),
  // Veggies
  broccoli: (
    <>
      <circle cx="8" cy="8" r="3" fill="#3a9d4e" />
      <circle cx="13" cy="7" r="3.2" fill="#43b058" />
      <circle cx="16" cy="10" r="2.6" fill="#3a9d4e" />
      <rect x="10.5" y="10" width="2.4" height="8" rx="1.2" fill="#8fbf6a" />
    </>
  ),
  leaf: (
    <>
      <path d="M4 20C4 10 12 4 20 4c0 10-8 16-16 16Z" fill="#43b058" />
      <path d="M17 7C12 9 8 13 6 18" stroke="#2f7d3d" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </>
  ),
  carrot: (
    <>
      <path d="M6 18l9-9 3 3-9 9-4 1 1-4Z" fill="#e8862e" />
      <path d="M15 9l2-4M17 9l3-2M13 7l0-3" stroke="#43b058" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  pepper: (
    <>
      <path d="M6 12c0-3 3-5 6-5s6 2 6 5-2 7-6 7-6-4-6-7Z" fill="#e23b3b" />
      <path d="M12 7V4M12 4c1.5 0 2.5-.8 3-2" stroke="#43b058" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  ),
  // Fats
  drop: <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z" fill="#d9b44a" />,
  avocado: (
    <>
      <path d="M12 3c4 0 7 4 7 9s-3 9-7 9-7-4-7-9 3-9 7-9Z" fill="#5c8a2f" />
      <path d="M12 6c2.6 0 4.5 3 4.5 6.5S14.6 19 12 19s-4.5-3-4.5-6.5S9.4 6 12 6Z" fill="#c7d98f" />
      <circle cx="12" cy="13" r="2.6" fill="#7a4a25" />
    </>
  ),
  nuts: (
    <>
      <ellipse cx="9" cy="11" rx="3" ry="4.2" transform="rotate(-20 9 11)" fill="#c79a5b" />
      <ellipse cx="14" cy="13" rx="3" ry="4.2" transform="rotate(-20 14 13)" fill="#b3823f" />
    </>
  ),
  cheese: (
    <>
      <path d="M3 16l16-8 2 3-13 7-5-2Z" fill="#f2c14e" />
      <circle cx="10" cy="13" r="1" fill="#d99e2b" />
      <circle cx="14" cy="11.5" r="0.9" fill="#d99e2b" />
    </>
  ),
  apple: (
    <>
      <path d="M12 7c-2-3-7-2-7 3 0 4 3 9 5 9 1 0 1-.6 2-.6s1 .6 2 .6c2 0 5-5 5-9 0-5-5-6-7-3Z" fill="#e23b3b" />
      <path d="M12 7c0-2 1-3 3-3.5" stroke="#5c8a2f" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  ),
};

export function FoodIcon({ name, size = 22, className }: { name: string; size?: number; className?: string }) {
  const glyph = P[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-hidden className={className} fill="none">
      {glyph ?? <circle cx="12" cy="12" r="5" fill="#8a8a90" />}
    </svg>
  );
}
