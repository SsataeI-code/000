/** Flat line icons (§4 — icons only, no decorative emoji). Inherit currentColor. */
import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  width: "100%",
  height: "100%",
  "aria-hidden": true,
};

export const IconToday = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <rect x="4" y="5" width="16" height="16" rx="1" />
    <path d="M4 9h16M8 3v4M16 3v4" />
  </svg>
);

export const IconHabits = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M4 12l5 5L20 6" />
  </svg>
);

export const IconFood = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M6 3v8a2 2 0 004 0V3M8 3v18M17 3c-1.5 1-2 3-2 6s.5 4 2 4v8" />
  </svg>
);

export const IconBody = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="6" r="3" />
    <path d="M6 21v-3a6 6 0 0112 0v3" />
  </svg>
);

export const IconYou = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0116 0" />
  </svg>
);

export const IconRoster = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20a6 6 0 0112 0M16 6a3 3 0 010 6M18 20a6 6 0 00-3-5.2" />
  </svg>
);

export const IconAttention = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M12 3l9 16H3z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);

export const IconMessages = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M4 5h16v11H8l-4 3z" />
  </svg>
);
