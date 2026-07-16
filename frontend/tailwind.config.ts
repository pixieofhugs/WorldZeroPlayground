import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        display: ["Lora", "serif"],
        body: ["Courier Prime", "monospace"],
        accent: ["Bebas Neue", "sans-serif"],
        // Per-faction headline fonts
        "faction-ua": ["IM Fell English", "serif"],
        "faction-everymen": ["Special Elite", "serif"],
        "faction-wow": ["Caveat", "cursive"],
        "faction-snide": ["Permanent Marker", "cursive"],
        "faction-ephemerists": ["Cinzel", "serif"],
        "faction-singularity": ["Share Tech Mono", "monospace"],
        "faction-ua-masters": ["UnifrakturCook", "serif"],
        // Style-named aliases (handoff naming)
        "faction-marker": ["Permanent Marker", "cursive"],
        "faction-codex": ["Cinzel", "serif"],
        "faction-blackletter": ["UnifrakturCook", "serif"],
        "faction-script": ["Caveat", "cursive"],
        "faction-old": ["IM Fell English", "serif"],
      },
      colors: {
        paper: "var(--color-bg-page)",
        ink: "var(--color-text-primary)",
        muted: "var(--color-text-secondary)",
        tertiary: "var(--color-text-tertiary)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        surface: "var(--color-bg-surface)",
        "surface-alt": "var(--color-bg-surface-alt)",
        accent: "var(--color-accent-primary)",
        // Faction palette — rainbow primaries (light mode; dark mode via CSS vars)
        ua: { DEFAULT: "#7c3aed", accent: "#a78bfa" },
        everymen: { DEFAULT: "#ca8a04", accent: "#fbbf24" },
        wow: { DEFAULT: "#be185d", accent: "#f472b6" },
        snide: { DEFAULT: "#6fae00", accent: "#b6ff2e" },
        ephemerists: { DEFAULT: "#1d6e72", accent: "#b0863a" },
        singularity: { DEFAULT: "#2563eb", accent: "#60a5fa" },
        "ua-masters": { DEFAULT: "#c2410c", accent: "#fb923c" },
      },
      // No fontSize block: the type scale lives in index.css as --text-*
      // (label tier) and --text-content/title/heading/display (content tier).
      // A hand-duplicated `text-wz-*` set here was a second place for the
      // numbers to drift, with zero uses. Removed in #627.
    },
  },
  plugins: [],
} satisfies Config;
