/**
 * The leveling mascot — a flame that visibly evolves as the client climbs the
 * level ladder (Spark → Legend, §5A the star). Higher tiers gain an inner
 * flame, a white-hot core, side sparks, and finally a crown, and the palette
 * warms from ember to gold. Pure flat SVG (works server- or client-side).
 */

interface Tier {
  outer: string;
  inner: string;
  core: boolean;
  sparks: boolean;
  crown: boolean;
  glow: string;
}

// One entry per level (1-based). Level ladder has 7 rungs (Spark…Legend).
const TIERS: Tier[] = [
  { outer: "#a8442a", inner: "#ff8a3d", core: false, sparks: false, crown: false, glow: "rgba(255,138,61,0.45)" }, // Spark
  { outer: "#c8401f", inner: "#ff9a3d", core: false, sparks: false, crown: false, glow: "rgba(255,120,40,0.5)" }, // Kindling
  { outer: "#e10600", inner: "#ff7a1a", core: false, sparks: false, crown: false, glow: "rgba(225,6,0,0.55)" }, // Steady
  { outer: "#e10600", inner: "#ff8a3d", core: true, sparks: false, crown: false, glow: "rgba(225,6,0,0.6)" }, // Committed
  { outer: "#ff2a1a", inner: "#ffb03a", core: true, sparks: true, crown: false, glow: "rgba(255,60,40,0.6)" }, // Relentless
  { outer: "#ff3b2f", inner: "#ffd23a", core: true, sparks: true, crown: false, glow: "rgba(255,120,40,0.7)" }, // Unstoppable
  { outer: "#ffb03a", inner: "#ffe89a", core: true, sparks: true, crown: true, glow: "rgba(255,176,58,0.8)" }, // Legend
];

export function LevelAvatar({ level, size = 64, className = "" }: { level: number; size?: number; className?: string }) {
  const t = TIERS[Math.min(TIERS.length, Math.max(1, level)) - 1];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={`Level ${level} mascot`}
      className={className}
      style={{ filter: `drop-shadow(0 0 ${Math.max(4, size / 8)}px ${t.glow})` }}
    >
      {/* badge disc */}
      <circle cx="24" cy="24" r="23" fill="#141419" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />

      {/* crown (Legend) */}
      {t.crown ? (
        <path d="M15 11 L18 6 L24 10 L30 6 L33 11 Z" fill="#ffd23a" stroke="#a8791a" strokeWidth="0.6" />
      ) : null}

      {/* side sparks */}
      {t.sparks ? (
        <>
          <circle cx="11" cy="22" r="1.7" fill={t.inner} />
          <circle cx="37" cy="20" r="2.1" fill={t.inner} />
          <circle cx="35" cy="30" r="1.4" fill={t.inner} opacity="0.8" />
        </>
      ) : null}

      {/* outer flame */}
      <path
        d="M24 12 C 29 19, 37 23, 33 32 C 30 39, 18 39, 15 32 C 12 24, 20 20, 24 12 Z"
        fill={t.outer}
      />
      {/* inner flame */}
      <path
        d="M24 20 C 27 24, 31 27, 29 32 C 27 37, 21 37, 19 32 C 17 27, 21 25, 24 20 Z"
        fill={t.inner}
      />
      {/* white-hot core */}
      {t.core ? <circle cx="24" cy="31" r="2.6" fill="#fff5e6" /> : null}
    </svg>
  );
}
