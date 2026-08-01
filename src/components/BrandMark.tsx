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
        <rect width="32" height="32" fill="#f4f4f2" />
        <rect x="6" y="14" width="20" height="4" fill="#e10600" />
        <rect x="14" y="6" width="4" height="20" fill="#0c0c0d" />
      </svg>
    </span>
  );
}
