/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
     * face in `src/fonts.css` was comfortably over that line until #2038 added
     * three subsets of ten codepoints — two of which are 1.8 KB and 3.8 KB, so
     * they went straight into the render-blocking stylesheet and put the CSS
     * budget 5.5 KB over its FAIL ceiling in one build.
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
  },
})
