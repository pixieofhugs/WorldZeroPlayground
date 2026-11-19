/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// The flow is lazy, so its chunk is found one waterfall level behind the entry's own preloads (#3593).
// A guest on `/` or `/start` fetches it with the entry. Script-injected, not static tags: the byte
// budget parses index.html, and it must run before the blocking stylesheet.
function preloadWelcomeFlow(): Plugin {
  return {
    name: 'preload-welcome-flow',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return html
        const files = new Set<string>(ctx.chunk?.imports)
        const css = new Set<string>()
        const walk = (name: string) => {
          const chunk = bundle[name]
          if (!chunk || chunk.type !== 'chunk' || files.has(name)) return
          files.add(name)
          chunk.imports.forEach(walk)
          chunk.viteMetadata?.importedCss.forEach((c) => css.add(c))
        }
        // Copy first: it is one tiny file the flow cannot mount without, and it queues behind the rest.
        for (const re of [/locales[/\\]en[/\\]onboarding\.json$/, /pages[/\\]Onboarding\.tsx$/]) {
          for (const chunk of Object.values(bundle)) if (chunk.type === 'chunk' && re.test(chunk.facadeModuleId ?? '')) walk(chunk.fileName)
        }
        ctx.chunk?.imports.forEach((i) => files.delete(i))
        if (!files.size) return html
        const script = `(function(){var p=location.pathname,h;try{h=localStorage.getItem('wz_session_hint')==='true'}catch(e){}if(p!=='/start'&&(p!=='/'||h))return;var m=${JSON.stringify([...files])},c=${JSON.stringify([...css])};function a(r,u){var l=document.createElement('link');l.rel=r;l.href='/'+u;l.crossOrigin='';if(r!=='modulepreload')l.as='style';document.head.appendChild(l)}m.forEach(function(u){a('modulepreload',u)});c.forEach(function(u){a('preload',u)})})()`
        return { html, tags: [{ tag: 'script', children: script, injectTo: 'head-prepend' as const }] }
      },
    },
  }
}

/**
 * DO NOT strip console output (esbuild `drop`, terser `drop_console`): Singularity's
 * Era 1 perk IS console output (#1869, `src/components/TheArray.tsx`), and losing it
 * fails nothing visibly. `theArray.test.ts` asserts the absence here.
 */
export default defineConfig({
  plugins: [react(), preloadWelcomeFlow()],
  server: {
    port: 5173,
    strictPort: true,
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
