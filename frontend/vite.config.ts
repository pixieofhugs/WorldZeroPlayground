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
    server: {
      deps: {
        /**
         * Transform react-router through Vite instead of letting Node's own
         * loader import it (#2449).
         *
         * Vitest externalises `node_modules`, so an externalised dep is loaded
         * by Node, not Vite. react-router 6 had no `exports` map, so that load
         * resolved plain CJS (`dist/main.js`) and Node's ESM machinery was
         * never involved. react-router 7 ships an `exports` map whose `node`
         * condition lists `module-sync`, which points at `.mjs` — so the same
         * `require` became a `require(esm)`, running Node's
         * `internal/modules/esm/module_job`.
         *
         * On the Node 20 CI pins that path is racy under parallel workers:
         * `this.module` comes back undefined and it dies on
         * `this.module.getStatus()`, taking the whole suite down at collection
         * — including suites that never import a router. It is a bad enough
         * race to be COUNT-UNSTABLE: two runs of the identical commit failed
         * 57 and then 54 of 422. It does not reproduce on Node 24, whose
         * `require(esm)` is mature, which is why this is invisible locally.
         *
         * Inlining hands the module to Vite's transform pipeline, so Node's
         * ESM loader never sees it and the race cannot occur on any Node.
         */
        inline: [/^react-router/],
      },
    },
  },
})
