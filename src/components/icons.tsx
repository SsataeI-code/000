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

export const IconFlame = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M12 3c1 3-1 4-1 6a2 2 0 104 0c0-1 0-2-.5-2.5C16 9 18 11 18 14a6 6 0 11-12 0c0-3 2-5 3-7 .8 1 2 1.5 3-4z" />
  </svg>
);

export const IconMedal = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="14" r="6" />
    <path d="M9 8L7 3M15 8l2-5M12 12l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2L9.1 14l2-.3z" />
  </svg>
);

export const IconLock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <rect x="5" y="11" width="14" height="9" rx="1" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </svg>
);

export const IconBolt = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M13 3L5 13h6l-1 8 8-10h-6z" />
  </svg>
);
