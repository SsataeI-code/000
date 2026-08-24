/**
 * Flat brand mark — an icon, never a decorative emoji (§4). When the owner has
 * uploaded a custom logo (CMS editable images), `src` renders it; otherwise this
 * built-in default shows, so it's never blank. The default is a faithful vector
 * recreation of the Total Form Fitness shield (white badge, dark border, red
 * barbell plates, push-up figure) — swap in the exact PNG via Coach → Edit copy
 * → Images → Logo for a pixel-perfect mark.
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

  const DARK = "#17171b";
  const RED = "#e10600";
  return (
    <span className="inline-flex items-center">
      <svg width={size} height={size} viewBox="0 0 120 132" role="img" aria-label="Total Form Fitness — White Plains NY, Est. 2016">
        {/* Shield — dark border with a white face (a self-contained badge) */}
        <path
          d="M60 5 L110 19 Q114 20 114 31 L114 68 Q114 99 60 127 Q6 99 6 68 L6 31 Q6 20 10 19 Z"
          fill={DARK}
        />
        <path
          d="M60 11 L105 24 Q108 25 108 33 L108 67 Q108 95 60 120 Q12 95 12 67 L12 33 Q12 25 15 24 Z"
          fill="#ffffff"
        />

        {/* Push-up / plank figure */}
        <g fill={DARK} stroke={DARK} strokeLinecap="round">
          <circle cx="80" cy="40" r="4.3" strokeWidth="0" />
          <polygon points="36,50 74,44 74,40 36,46" strokeWidth="0" />
          <line x1="73" y1="43" x2="71" y2="60" strokeWidth="3" />
          <line x1="37" y1="48" x2="32" y2="60" strokeWidth="3" />
        </g>

        {/* Barbell — dark bar with brand-red plates, acting as the divider */}
        <rect x="16" y="61" width="88" height="5" rx="2" fill={DARK} />
        <rect x="15" y="55.5" width="5.5" height="16" rx="1.2" fill={RED} />
        <rect x="22" y="58" width="4" height="11" rx="1" fill={RED} />
        <rect x="99.5" y="55.5" width="5.5" height="16" rx="1.2" fill={RED} />
        <rect x="94" y="58" width="4" height="11" rx="1" fill={RED} />

        {/* Wordmark */}
        <text x="60" y="60" textAnchor="middle" fontFamily="Archivo, system-ui, sans-serif" fontWeight="900" fontSize="17" letterSpacing="0.3" fill={DARK}>
          TOTALFORM
        </text>
        <text x="60" y="82" textAnchor="middle" fontFamily="Archivo, system-ui, sans-serif" fontWeight="800" fontSize="15" letterSpacing="1.5" fill={DARK}>
          FITNESS
        </text>
        <line x1="30" y1="89" x2="90" y2="89" stroke={DARK} strokeWidth="1.5" />
        <text x="60" y="101" textAnchor="middle" fontFamily="Oswald, system-ui, sans-serif" fontWeight="600" fontSize="7.5" letterSpacing="1.2" fill={DARK}>
          WHITE PLAINS NY
        </text>
        <text x="60" y="113" textAnchor="middle" fontFamily="Archivo, system-ui, sans-serif" fontWeight="800" fontSize="9" letterSpacing="0.8" fill={DARK}>
          EST 2016
        </text>
      </svg>
    </span>
  );
}
