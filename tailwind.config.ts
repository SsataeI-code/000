import type { Config } from "tailwindcss";

/**
 * House style (CLAUDE.md §4) — non-negotiable brand identity.
 * Bold, editorial, flat, high-contrast. No gradients. These tokens are the
 * single source of design truth; components reference them, never raw hexes.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    // 780px breakpoint (§4). Below is the mobile bottom-tab layout.
    screens: {
      md: "780px",
      lg: "1024px",
    },
    extend: {
      colors: {
        // Dark theme: near-white "ink" text on black surfaces (§4 inverted).
        ink: "#f4f4f2",
        red: {
          DEFAULT: "#e10600",
          ink: "#ff5b4e", // readable red on dark (error text); brightens on hover
        },
        success: "#34c759",
        surface: {
          DEFAULT: "#17171b", // cards
          muted: "#0c0c0d", // page background
        },
        hairline: "#2c2c31",
        // A slightly-raised dark block for former "bg-ink" accents (banners, bubbles).
        elevated: "#26262c",
      },
      fontFamily: {
        // Archivo 800/900 UPPERCASE headlines · Oswald labels · Spline Sans body.
        display: ["var(--font-archivo)", "system-ui", "sans-serif"],
        label: ["var(--font-oswald)", "system-ui", "sans-serif"],
        body: ["var(--font-spline)", "system-ui", "sans-serif"],
      },
      borderColor: {
        DEFAULT: "#2c2c31",
      },
      minHeight: {
        // 44px minimum tap target (accessibility, §4).
        tap: "44px",
      },
      minWidth: {
        tap: "44px",
      },
      keyframes: {
        "fill-up": {
          from: { transform: "scaleY(0)" },
          to: { transform: "scaleY(1)" },
        },
        "red-pulse": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.06)", opacity: "0.85" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "stagger-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        // All motion is opt-out via prefers-reduced-motion (see globals.css).
        "fill-up": "fill-up 480ms cubic-bezier(0.16, 1, 0.3, 1)",
        "red-pulse": "red-pulse 420ms ease-out",
        "stagger-in": "stagger-in 320ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
