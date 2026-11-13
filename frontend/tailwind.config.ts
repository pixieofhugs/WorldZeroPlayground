import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        display: ["Lora", "serif"],
        body: ["var(--font-body)"],
        accent: ["Bebas Neue", "sans-serif"],
        // Faction stacks live in index.css as --font-faction-*, read via var().
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
        // Faction colour: factionCssVar() / factionFill() (utils/factions.ts),
        // never a Tailwind utility; index.css is the only home for colour values.
      },
      // No fontSize: the type scale is --text-* in index.css (#627).
    },
  },
  plugins: [],
} satisfies Config;
