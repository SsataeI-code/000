/** Flat brand mark — an icon, never a decorative emoji (§4). */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        role="img"
        aria-label="Total Form Fitness"
        fill="none"
      >
        <rect width="32" height="32" fill="#0c0c0d" />
        <rect x="6" y="14" width="20" height="4" fill="#e10600" />
        <rect x="14" y="6" width="4" height="20" fill="#ffffff" />
      </svg>
    </span>
  );
}
