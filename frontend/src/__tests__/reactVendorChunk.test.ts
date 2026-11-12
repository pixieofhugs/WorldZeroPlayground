/**
 * #2843 — React's runtime stays in a chunk of its own.
 *
 * Rollup's automatic split is a heuristic that dissolved once (React 19), and
 * the byte budget can't see it: the cost is on repeat visits, when a separate
 * hashed vendor chunk survives an app deploy and the entry chunk doesn't.
 *
 * Reads `vite.config.ts` as source: CI runs vitest before the build (no `dist/`),
 * and importing the config from `src` fails tsc with TS6305 (see `theArray.test.ts`).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  fileURLToPath(new URL('../../vite.config.ts', import.meta.url)),
  'utf8',
)

/** Comments dropped, or the config's prose would satisfy the assertions. */
const code = source
  .split('\n')
  .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
  .join('\n')

describe('the react vendor chunk is declared, not inferred (#2843)', () => {
  it('reads the config and not an empty string', () => {
    expect(code).toContain('defineConfig')
    expect(code).toContain('rollupOptions')
  })

  it('groups react, react-dom and the scheduler into one named chunk', () => {
    expect(code).toMatch(/\bmanualChunks\b/)
    // Named so it's identifiable in the budget's asset table.
    expect(code).toMatch(/['"]react-vendor['"]/)
    for (const pkg of ['react', 'react-dom', 'scheduler']) {
      expect(code).toContain(pkg)
    }
  })

  it('matches the package directory, not a bare substring of any path', () => {
    // A bare `react` would also match `react-router` etc. and drag them into vendor.
    const grouping = code.slice(code.indexOf('manualChunks'))
    expect(grouping).toMatch(/node_modules\[\/\\\\\]/)
    expect(grouping).not.toMatch(/react-i18next|react-router/)
  })
})
