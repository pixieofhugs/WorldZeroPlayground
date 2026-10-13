/**
 * Tailwind v4 moved its PostCSS bridge into `@tailwindcss/postcss` (#2918).
 *
 * `autoprefixer` is gone with it, not merely unlisted: v4 runs Lightning CSS
 * over its own output and prefixes what needs prefixing. Nothing else in this
 * repo consumed it — no `browserslist` key, no other PostCSS entry — and the
 * one place the source SPELLS a prefix out by hand
 * (`03-faction-chrome-1.css`'s `-webkit-mask-image`) says in its own comment
 * that it is written literally rather than left to a plugin, and measured the
 * built sheet as byte-identical either way. So that mask survives this
 * removal for the reason it was written that way.
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
