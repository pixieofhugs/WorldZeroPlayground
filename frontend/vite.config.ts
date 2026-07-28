/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
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
