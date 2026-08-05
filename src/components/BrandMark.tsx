/**
 * Flat brand mark — an icon, never a decorative emoji (§4). When the owner has
 * uploaded a custom logo (CMS editable images), `src` renders it; otherwise the
 * built-in house-style default shows, so it's never blank.
 */
export function BrandMark({ size = 28, src = null }: { size?: number; src?: string | null }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="Total Form Fitness"
        width={size}
        height={size}
        className="inline-block object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  // Default: the Total Form Fitness shield — barbell + push-up figure, recreated
  // as flat vector art. The original's black lettering renders in near-white ink
  // for the dark theme (§4 inverted); barbell plates stay brand red.
  const INK = "#f4f4f2";
  const RED = "#e10600";
  return (
    <span className="inline-flex items-center">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 104"
        role="img"
        aria-label="Total Form Fitness"
        fill="none"
      >
        {/* Shield outline */}
        <path
          d="M50 4 L88 15 V49 C88 73 71 90 50 99 C29 90 12 73 12 49 V15 Z"
          fill="none"
          stroke={INK}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* Push-up / plank figure across the top */}
        <circle cx="63" cy="26" r="2.6" fill={INK} />
        <path d="M31 33 H61" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M40 33 L45 40 M53 33 L51 40" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        {/* Barbell — plates in brand red */}
        <rect x="24" y="46.5" width="52" height="3.5" rx="1.2" fill={INK} />
        <rect x="20.5" y="42.5" width="6" height="11.5" rx="1" fill={RED} />
        <rect x="73.5" y="42.5" width="6" height="11.5" rx="1" fill={RED} />
        {/* Wordmark (legible when large; a shield mark when small) */}
        <text x="50" y="49.5" textAnchor="middle" fontFamily="Archivo, system-ui, sans-serif" fontWeight="800" fontSize="11.5" letterSpacing="0.5" fill={INK}>
          TOTALFORM
        </text>
        <text x="50" y="63" textAnchor="middle" fontFamily="Archivo, system-ui, sans-serif" fontWeight="800" fontSize="11.5" letterSpacing="0.5" fill={INK}>
          FITNESS
        </text>
        <text x="50" y="76" textAnchor="middle" fontFamily="Oswald, system-ui, sans-serif" fontWeight="600" fontSize="5.6" letterSpacing="0.8" fill={INK}>
          WHITE PLAINS · EST 2016
        </text>
      </svg>
    </span>
  );
}
