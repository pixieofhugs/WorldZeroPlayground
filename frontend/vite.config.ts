/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * DO NOT strip console output (esbuild `drop`, terser `drop_console`): Singularity's
 * Era 1 perk IS console output (#1869, `src/components/TheArray.tsx`), and losing it
 * fails nothing visibly. `theArray.test.ts` asserts the absence here.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    /**
     * Never inline a font (#2038): a data: URI defeats `unicode-range` lazy fetching
     * (#1977) and the immutable /assets cache, and bloats render-blocking CSS.
     */
    assetsInlineLimit: (filePath) => (filePath.endsWith('.woff2') ? false : undefined),
    /**
     * Explicit React vendor chunk (#2843): Rollup's automatic split stopped firing
     * with React 19, folding the runtime into the entry chunk so returning visitors
     * re-fetched it every deploy. Match on the package directory: a bare `react`
     * test also catches react-i18next/react-router. `scheduler` is react-dom-only.
     * Ratchet: `src/__tests__/reactVendorChunk.test.ts`.
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
  // renderToStaticMarkup needs no DOM, so the default 'node' environment is fine; a file that needs effects opts into jsdom itself.
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    // Resolves code-split archetypes (see src/test/preloadArchetypes.ts).
    setupFiles: ['./src/test/preloadArchetypes.ts'],
    // Cold CI transform of ~195 archetype modules overruns the 10s default.
    hookTimeout: 60_000,
  },
})
