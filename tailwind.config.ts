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
          DEFAULT: "#1c1c22", // cards — lifted off the page so they read as cards
          muted: "#0b0b0d", // page background (a touch deeper for contrast)
          input: "#131318", // form fields — inset, clearly a field
        },
        hairline: "#34353d", // visible borders (were nearly invisible)
        // A slightly-raised dark block for former "bg-ink" accents (banners, bubbles).
        elevated: "#2a2a32",
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
      // Cartoon-game rounding — chunkier corners everywhere (rounded-lg/xl/2xl
      // cascade to every card, button and control the app already uses).
      borderRadius: {
        none: "0",
        sm: "8px",
        DEFAULT: "12px",
        md: "13px",
        lg: "18px",
        xl: "24px",
        "2xl": "30px",
        "3xl": "38px",
        full: "9999px",
      },
      // Gradients (owner loosened the no-gradient rule for a game look).
      backgroundImage: {
        "grad-red": "linear-gradient(140deg,#ff6a4d 0%,#e10600 55%,#a10400 100%)",
        "grad-xp": "linear-gradient(90deg,#ffb03a 0%,#ff5b4e 45%,#e10600 100%)",
        "grad-success": "linear-gradient(140deg,#6BE78A 0%,#34c759 60%,#1f9d47 100%)",
        "grad-surface": "linear-gradient(160deg,#2a2a34 0%,#1b1b22 62%,#141419 100%)",
        "grad-elevated": "linear-gradient(150deg,#33333f 0%,#26262f 55%,#1d1d25 100%)",
        "grad-page": "radial-gradient(1100px 520px at 50% -8%, rgba(225,6,0,0.14), transparent 60%)",
      },
      // Cartoon chunk + neon glow shadows.
      boxShadow: {
        pop: "0 5px 0 0 rgba(0,0,0,0.5)",
        "pop-red": "0 5px 0 0 #7c0400",
        "pop-success": "0 5px 0 0 #167a37",
        card: "0 8px 24px -8px rgba(0,0,0,0.7)",
        glow: "0 0 26px rgba(225,6,0,0.5)",
        "glow-lg": "0 0 44px rgba(225,6,0,0.55)",
        "glow-success": "0 0 24px rgba(52,199,89,0.45)",
        "glow-gold": "0 0 24px rgba(255,176,58,0.55)",
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
        // Bouncy cartoon pop-in for cards/badges.
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.8) translateY(8px)" },
          "60%": { opacity: "1", transform: "scale(1.04) translateY(0)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        // Floating "+XP" burst that rises and fades.
        "xp-burst": {
          "0%": { opacity: "0", transform: "translateY(6px) scale(0.8)" },
          "20%": { opacity: "1", transform: "translateY(-2px) scale(1.1)" },
          "100%": { opacity: "0", transform: "translateY(-38px) scale(1)" },
        },
        // Neon glow breathing for level/goal elements.
        "glow-pulse": {
          "0%, 100%": { filter: "brightness(1)", boxShadow: "0 0 18px rgba(225,6,0,0.4)" },
          "50%": { filter: "brightness(1.12)", boxShadow: "0 0 34px rgba(225,6,0,0.7)" },
        },
        // Level-up flare.
        "level-up": {
          "0%": { transform: "scale(1)" },
          "35%": { transform: "scale(1.25) rotate(-3deg)" },
          "70%": { transform: "scale(0.95) rotate(2deg)" },
          "100%": { transform: "scale(1)" },
        },
        shine: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(220%)" },
        },
      },
      animation: {
        // All motion is opt-out via prefers-reduced-motion (see globals.css).
        "fill-up": "fill-up 480ms cubic-bezier(0.16, 1, 0.3, 1)",
        "red-pulse": "red-pulse 420ms ease-out",
        "stagger-in": "stagger-in 320ms ease-out both",
        "pop-in": "pop-in 460ms cubic-bezier(0.34,1.56,0.64,1) both",
        "xp-burst": "xp-burst 1100ms ease-out forwards",
        "glow-pulse": "glow-pulse 2.4s ease-in-out infinite",
        "level-up": "level-up 700ms cubic-bezier(0.34,1.56,0.64,1)",
        shine: "shine 2.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
