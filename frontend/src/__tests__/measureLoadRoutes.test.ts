/**
 * Every route `measure-load.mjs` measures must be a route the app serves.
 *
 * THE TRAP THIS GUARD EXISTS FOR
 * ------------------------------
 * The measurement script names routes as plain strings, so nothing connects
 * them to `App.tsx`. When #1136 renamed the praxis route to `/praxis`, the
 * script kept asking for `/praxes` — and a React SPA answers an unknown path
 * with HTTP 200 and its own shell, not a 404. The run therefore *succeeded*:
 * it measured the shell, reported `NO CONTENT`, and that reading sat in the
 * nightly output for weeks looking like a slow page rather than a dead URL.
 *
 * `praxisPlural.test.ts` encodes the same /praxis-vs-/praxes distinction but
 * scans `src/` only, so it never saw `scripts/`. This test closes that gap for
 * every route at once instead of for one spelling.
 *
 * It is a source scan because the script cannot be imported: it has top-level
 * await, launches Chromium, and calls the API at module load.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))
const APP_SOURCE = readFileSync(join(SRC_DIR, 'App.tsx'), 'utf8')
const SCRIPT_SOURCE = readFileSync(join(SRC_DIR, '..', 'scripts', 'measure-load.mjs'), 'utf8')

/**
 * `path="/tasks/:id"` — matched on the attribute rather than the `<Route>` tag,
 * because the guarded ones wrap onto their own lines.
 */
const declaredRoutes = [...APP_SOURCE.matchAll(/path="([^"]+)"/g)].map((match) => match[1])

/**
 * `{ path: '/tasks' }` and the `` { path: `/tasks/${ids.task}` } `` pushed for
 * the detail rows. An interpolation stands in for an id, so it collapses to a
 * single opaque segment — what it holds at runtime does not change which route
 * has to exist.
 */
const measuredPaths = [...SCRIPT_SOURCE.matchAll(/path:\s*(['"`])([^'"`]+)\1/g)].map((match) =>
  match[2].replace(/\$\{[^}]*\}/g, '1'),
)

const escapeRegex = (segment: string) => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** `/factions/:slug` accepts `/factions/coven`; `/factions` does not. */
const matches = (routePath: string, candidate: string) =>
  new RegExp(
    `^${routePath
      .split('/')
      .map((segment) => (segment.startsWith(':') ? '[^/]+' : escapeRegex(segment)))
      .join('/')}$`,
  ).test(candidate)

describe('measure-load.mjs measures routes the app actually serves', () => {
  it('has no measured path without a matching <Route>', () => {
    // A failure here means the script is measuring the SPA shell and reporting
    // it as a slow page. Fix the path in scripts/measure-load.mjs — or, if the
    // route genuinely moved, in both places.
    const unroutable = measuredPaths.filter(
      (measured) => !declaredRoutes.some((route) => matches(route, measured)),
    )
    expect(unroutable).toEqual([])
  })
})

describe('the scan sees both files', () => {
  // Guards the guard: were either extraction to silently yield nothing, the
  // assertion above would pass by having no work to do.
  it('finds the routes App.tsx declares', () => {
    expect(declaredRoutes.length).toBeGreaterThan(15)
    expect(declaredRoutes).toContain('/praxis/:id')
  })

  it('finds the paths the script measures', () => {
    expect(measuredPaths.length).toBeGreaterThan(8)
    expect(measuredPaths).toContain('/praxis')
  })

  it('resolves an id interpolation to one opaque segment', () => {
    expect(measuredPaths).toContain('/praxis/1')
    expect(measuredPaths).toContain('/characters/1')
  })

  it('discriminates — it would have caught #1136', () => {
    // The exact regression that prompted this file: `/praxes` matches no route.
    expect(declaredRoutes.some((route) => matches(route, '/praxes'))).toBe(false)
    expect(declaredRoutes.some((route) => matches(route, '/praxes/1'))).toBe(false)
    expect(declaredRoutes.some((route) => matches(route, '/praxis/1'))).toBe(true)
    // A parameterised segment must not swallow a deeper path.
    expect(matches('/characters/:id', '/characters/1/edit')).toBe(false)
  })
})
