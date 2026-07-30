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
        // No faction rows here: the per-faction headline stacks live in
        // index.css as --font-faction-* (marker/codex/blackletter/script/old
        // and the slug-named set). Twelve hand-duplicated entries sat here —
        // seven slug-named, five style-named "handoff" aliases — and Tailwind
        // emitted none of them: every consumer reaches the stack through
        // var(--font-faction-*), never a `font-faction-*` utility. Removed in
        // #1212 alongside the faction colour block, same reasoning as the
        // fontSize note below.
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
        // No faction rows here. Every row above is var()-backed, so index.css
        // stays the only home for a colour VALUE; a literal-hex faction block
        // sat here for seven slugs and was a second place for the numbers to
        // drift. It had drifted four ways by the time it went: `ua` was
        // #7c3aed purple against a live burnt-sienna --faction-ua (#848),
        // `everymen` and `wow` held na-spectrum stops rather than their own
        // hues (the pink moved to Cozy Coven in #784, WOW took yellow in
        // #812), Coven had no row at all, and `ua-masters` is not a faction.
        // The `accent:` sub-key named a --faction-*-accent tier that has never
        // existed. Tailwind emitted none of it — no bg-/text-/border-/ring-/
        // from- utility for any of those keys appears in src. Removed in #1212.
        // Faction colour is read through factionCssVar() / factionFill()
        // (utils/factions.ts) against --faction-{key}-*, never a Tailwind
        // utility.
      },
      // No fontSize block: the type scale lives in index.css as --text-*
      // (label tier) and --text-content/title/heading/display (content tier).
      // A hand-duplicated `text-wz-*` set here was a second place for the
      // numbers to drift, with zero uses. Removed in #627.
    },
  },
  plugins: [],
} satisfies Config;
