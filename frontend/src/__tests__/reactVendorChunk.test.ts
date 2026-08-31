/**
 * #2843 — React's runtime stays in a chunk of its own.
 *
 * WHAT BROKE, AND WHY NO CHECK SPOKE
 * ----------------------------------
 * `vite.config.ts` declared no `manualChunks`, so the ~41 KB `react-dom-*.js`
 * chunk `main` shipped for months was Rollup's AUTOMATIC split of a module
 * shared across dynamic-import chunks — a heuristic, not a decision. React 19
 * (#2920) changed the module graph's shape and the split dissolved: react-dom's
 * runtime moved into the entry chunk and `react-dom-*.js` became a 1.3 KB
 * re-export shim.
 *
 * The byte budget could not see it. Moving code between two blocking chunks is
 * close to neutral on a cold first load, which is the only load a byte count
 * measures. The regression is on the SECOND visit: a content-hashed vendor
 * chunk survives an app-code deploy and the entry chunk does not, so a
 * returning visitor re-fetched ~58 KB gzipped of unchanged React runtime on
 * every deploy — and `main` auto-deploys.
 *
 * So this is the `motionSplit.test.ts` shape: a win that is invisible in a
 * green build. Delete the grouping and the initial-load total moves by 634
 * bytes, the budget prints the same WARN block it already prints, every test
 * passes, and the cache regression is silently back. This file is the ratchet.
 *
 * WHY A SOURCE READ AND NOT THE BUILT OUTPUT
 * ------------------------------------------
 * The honest seam would be `dist/`, but CI runs vitest BEFORE `npm run build`,
 * so there is no output to read at the moment this runs — and a check that
 * reads a stale or absent `dist/` passes on nothing, which is the failure
 * `bundle-budget.mjs`'s own floor guards exist to prevent.
 *
 * Reading the config as SOURCE rather than importing it is not squeamishness
 * either, and the reason is `theArray.test.ts`'s verbatim: `vite.config.ts`
 * belongs to the `tsconfig.node.json` composite project, so importing it from
 * `src` fails `tsc --noEmit` with TS6305 before it can ever run. That file
 * guards the ABSENCE of a build flag; this one guards the PRESENCE of one.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  fileURLToPath(new URL('../../vite.config.ts', import.meta.url)),
  'utf8',
)

/** Comments are dropped first: the docblocks quote the very names asserted on
 *  below, so a comment-blind read would pass on prose alone. */
const code = source
  .split('\n')
  .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
  .join('\n')

describe('the react vendor chunk is declared, not inferred (#2843)', () => {
  it('reads the config and not an empty string', () => {
    // The same proof `theArray.test.ts` takes: without it every assertion
    // below passes by reading nothing.
    expect(code).toContain('defineConfig')
    expect(code).toContain('rollupOptions')
  })

  it('groups react, react-dom and the scheduler into one named chunk', () => {
    expect(code).toMatch(/\bmanualChunks\b/)
    // The name is asserted because it is what makes the chunk identifiable in
    // the budget's asset table when someone next reads it.
    expect(code).toMatch(/['"]react-vendor['"]/)
    for (const pkg of ['react', 'react-dom', 'scheduler']) {
      expect(code).toContain(pkg)
    }
  })

  it('matches the package directory, not a bare substring of any path', () => {
    // `/react/` rather than `react` — the latter also matches
    // `react-i18next`, `react-router` and `@vitejs/plugin-react`, which would
    // drag most of the app's dependency tree into the "vendor" chunk and turn
    // a cache win into a cache miss on every route.
    const grouping = code.slice(code.indexOf('manualChunks'))
    expect(grouping).toMatch(/node_modules\[\/\\\\\]/)
    expect(grouping).not.toMatch(/react-i18next|react-router/)
  })
})
