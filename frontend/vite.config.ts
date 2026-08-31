/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * ⚠️ DO NOT CONFIGURE CONSOLE STRIPPING HERE — a faction's perk depends on it.
 *
 * `esbuild: { drop: ['console'] }`, or terser's `drop_console`, is a normal and
 * sensible optimisation. In this app it would silently delete Singularity's
 * entire Era 1 perk (#1869): "the array" IS console output — see
 * `src/components/TheArray.tsx`. Nothing about that module can defend itself
 * from a build flag set over here, and the deletion would show up as no failing
 * test, no error and no missing pixel; just a faction that quietly stopped
 * having a mechanic.
 *
 * So the absence of that config is load-bearing, and
 * `src/components/__tests__/theArray.test.ts` asserts it against this very
 * object. If you have a real reason to strip console output, the perk needs
 * another channel FIRST and that test is the conversation.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    /**
     * A FONT IS NEVER INLINED, whatever its size (#2038).
     *
     * Vite base64s any asset under 4 KB into the file that references it. Every
     * face in the generated sheets was comfortably over that line until #2038
     * added three subsets of ten codepoints — two of which are 1.8 KB and 3.8 KB,
     * so they went straight into the render-blocking stylesheet and put the CSS
     * budget 5.5 KB over its FAIL ceiling in one build. (Those three moved to
     * `src/fonts.faction.css` in #2079; inlining them would now put a KB of
     * base64 into a faction chunk instead, which is quieter and just as wrong.)
     *
     * The size is the smaller half of it. Inlining also destroys what makes
     * self-hosting cheap (#1977): a `@font-face` behind a `unicode-range` is
     * fetched only by a page whose glyphs fall in that range, and a data: URI
     * is fetched by everyone, before first paint, on every visit — the Arabic
     * and Japanese cuts paid for by a reader who will never see either script.
     * It also forfeits the immutable cache headers render.yaml gives /assets.
     */
    assetsInlineLimit: (filePath) => (filePath.endsWith('.woff2') ? false : undefined),
    /**
     * REACT'S RUNTIME GETS A CHUNK BY DECISION, NOT BY HEURISTIC (#2843).
     *
     * This file declared no `manualChunks` until now, so the ~41 KB
     * `react-dom-*.js` chunk `main` shipped for months was Rollup's AUTOMATIC
     * split of a module shared across dynamic-import chunks. React 19 (#2920)
     * changed the module graph's shape, the heuristic stopped firing, and
     * react-dom's runtime folded into the entry chunk — `react-dom-*.js`
     * survived as a 1.3 KB re-export shim.
     *
     * WHAT THAT COST IS NOT MOSTLY BYTES. Restoring the split takes initial-load
     * JS 152,680 -> 152,046 gzipped, and that 634 bytes is only the chunk
     * wrappers of the three shims collapsing into one. The real regression was
     * invisible to a byte count, because a byte count measures a COLD first
     * load and moving code between two blocking chunks is neutral there. It is
     * the SECOND visit that changed: a content-hashed vendor chunk survives an
     * app-code deploy and the entry chunk does not, so a returning visitor
     * re-fetched 58.8 KB gzipped of unchanged React runtime on every deploy —
     * and `main` auto-deploys.
     *
     * THE MATCH IS ON THE PACKAGE DIRECTORY, deliberately. A bare `react` test
     * also matches `react-i18next`, `react-router` and `@vitejs/plugin-react`;
     * grouping those would put most of the dependency tree behind one hash and
     * turn the cache win into a cache miss on every route. `scheduler` is in
     * because react-dom requires it and nothing else does, so it rehashes on
     * exactly the same cadence.
     *
     * `src/__tests__/reactVendorChunk.test.ts` is the ratchet, for the reason
     * the CSS split entries in `scripts/bundle-budget.mjs` give: delete this and
     * the budget prints the same WARN block it already prints, every test
     * passes, and the cache regression is quietly back.
     */
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (/node_modules[/\\](react|react-dom|scheduler)[/\\]/.test(id)) return 'react-vendor'
          return undefined
        },
      },
    },
  },
  // renderToStaticMarkup needs no DOM, so the default 'node' environment is fine.
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    // Faction archetypes are code-split and render null until their chunk
    // lands; this resolves them all in a beforeAll — see
    // src/test/preloadArchetypes.ts for why it must not be module scope.
    setupFiles: ['./src/test/preloadArchetypes.ts'],
    // That preload resolves ~195 archetype modules per test file. With a warm
    // transform cache it is milliseconds, but CI always starts cold and the
    // first file to run pays for the whole graph — which overran the default
    // 10s hook timeout and failed three unrelated suites at collection.
    hookTimeout: 60_000,
  },
})
