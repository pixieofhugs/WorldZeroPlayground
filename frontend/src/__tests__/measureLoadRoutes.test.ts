/**
 * Every route `measure-load.mjs` measures must be a route the app serves.
 *
 * The SPA answers an unknown path with 200 and its shell, so a dead route
 * measures as a slow page rather than failing. A source scan: the script
 * launches Chromium at module load and can't be imported.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))
const APP_SOURCE = readFileSync(join(SRC_DIR, 'App.tsx'), 'utf8')
const SCRIPT_SOURCE = readFileSync(join(SRC_DIR, '..', 'scripts', 'measure-load.mjs'), 'utf8')

/** Matched on `path="…"`, not `<Route>`: guarded routes wrap onto their own lines. */
const declaredRoutes = [...APP_SOURCE.matchAll(/path="([^"]+)"/g)].map((match) => match[1])

/** `{ path: … }` entries; an `${id}` interpolation collapses to one opaque segment. */
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
    // Fix the path in scripts/measure-load.mjs.
    const unroutable = measuredPaths.filter(
      (measured) => !declaredRoutes.some((route) => matches(route, measured)),
    )
    expect(unroutable).toEqual([])
  })
})

describe('the scan sees both files', () => {
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
    expect(declaredRoutes.some((route) => matches(route, '/praxes'))).toBe(false)
    expect(declaredRoutes.some((route) => matches(route, '/praxes/1'))).toBe(false)
    expect(declaredRoutes.some((route) => matches(route, '/praxis/1'))).toBe(true)
    // A parameterised segment must not swallow a deeper path.
    expect(matches('/characters/:id', '/characters/1/edit')).toBe(false)
  })
})
