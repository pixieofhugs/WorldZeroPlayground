/**
 * #1136 — the plural of *praxis* is *praxis*, and the rename must not have
 * touched the API.
 *
 * The route is `/praxis`; the backend API stays `/praxes`. A find/replace that
 * crosses the seam 404s every request while everything stays green. Under
 * `api/` = API path; elsewhere `/praxes` is a regression. Comments and module
 * paths (`pages/praxes/` is a real directory) are stripped first.
 */
import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { SRC_DIR, sourceFiles, stripComments, toRelative } from '../test/sourceScan'

const LOCALES_DIR = join(SRC_DIR, 'locales', 'en')

const allSource = () => sourceFiles({ includeTests: true })

/** A letter after `/praxes/` means a filesystem path (routes take `:id`, `${…}`, digits). */
const stripModulePaths = (source: string) =>
  source
    .replace(/from\s*['"][^'"]+['"]/g, 'from ""')
    .replace(/import\s*\(\s*['"][^'"]+['"]\s*\)/g, 'import("")')
    .replace(/praxes\/(?=[A-Za-z_])/g, 'DIR/')

const routePaths = (source: string) => stripModulePaths(stripComments(source))

/** These name `/praxes` in fixtures that assert it is rejected. */
const FIXTURE_FILES = new Set([
  '__tests__/praxisPlural.test.ts',
  '__tests__/measureLoadRoutes.test.ts',
])

/**
 * e2e scenario builders (#2888) issue real API requests outside `api/`, so
 * they are held to the API rule (never request `/praxis`), not excused.
 */
const E2E_API_CALLERS = [
  'utils/e2eScenario.ts',
  'utils/collabScenario.ts',
  'utils/duelScenario.ts',
  'utils/__tests__/e2eScenario.test.ts',
  'utils/__tests__/collabScenario.test.ts',
  'utils/__tests__/duelScenario.test.ts',
  'utils/__tests__/fakeScenario.ts',
]

describe('the API keeps saying /praxes (#1136)', () => {
  /** Shipped client modules only: `api/__tests__` mixes API URLs with route pathnames. */
  const apiFiles = [
    ...sourceFiles({ dir: join(SRC_DIR, 'api'), includeTests: true }).filter(
      (path) => !toRelative(path).startsWith('api/__tests__/'),
    ),
    ...E2E_API_CALLERS.map((relative) => join(SRC_DIR, relative)),
  ]

  it('never requests the frontend route path /praxis', () => {
    // A rename crossed the seam: put `/praxes` back.
    const offenders = apiFiles
      .filter((path) => /\/praxis(?=[/'"`?])/.test(routePaths(readFileSync(path, 'utf8'))))
      .map(toRelative)
    expect(offenders).toEqual([])
  })

  it('still holds the API paths it is supposed to hold', () => {
    const occurrences = apiFiles
      .map((path) => readFileSync(path, 'utf8').match(/\/praxes/g)?.length ?? 0)
      .reduce((total, n) => total + n, 0)
    expect(occurrences).toBeGreaterThanOrEqual(25)
  })
})

describe('no router path says /praxes (#1136)', () => {
  it('has no /praxes left outside api/', () => {
    const offenders = allSource()
      .filter(
        (path) =>
          !toRelative(path).startsWith('api/') &&
          !FIXTURE_FILES.has(toRelative(path)) &&
          !E2E_API_CALLERS.includes(toRelative(path)),
      )
      .filter((path) => /\/praxes/.test(routePaths(readFileSync(path, 'utf8'))))
      .map(toRelative)
    expect(offenders).toEqual([])
  })
})

describe('no user-visible string says "praxes" (#1136)', () => {
  /** Values only — `praxes` is a live i18n KEY in admin.json and feed.json. */
  function stringValues(node: unknown): string[] {
    if (typeof node === 'string') return [node]
    if (node && typeof node === 'object') return Object.values(node).flatMap(stringValues)
    return []
  }

  const catalogs = sourceFiles({ dir: LOCALES_DIR, match: /\.json$/ }).map((path) =>
    basename(path),
  )

  it.each(catalogs)('%s', (catalog) => {
    const values = stringValues(JSON.parse(readFileSync(join(LOCALES_DIR, catalog), 'utf8')))
    expect(values.filter((value) => /praxes/i.test(value))).toEqual([])
  })

  it('reads catalogs that actually contain copy', () => {
    expect(catalogs.length).toBeGreaterThan(5)
  })
})

describe('the scan sees the codebase', () => {
  it('strips comments and source paths, but not real route literals', () => {
    expect(routePaths('// GET /praxes/{id}/voters')).not.toContain('/praxes')
    expect(routePaths("import x from './praxes/usePraxes'")).not.toContain('/praxes')
    expect(routePaths("readFileSync('../../pages/praxes/usePraxes.ts')")).not.toContain('/praxes')
    expect(routePaths("import { getPraxis } from './praxis'")).not.toContain('/praxis')
    expect(routePaths('navigate(`/praxes/${id}/edit`)')).toContain('/praxes')
    expect(routePaths('<Route path="/praxes/:id" />')).toContain('/praxes')
    expect(routePaths("<Link to='/praxes'>")).toContain('/praxes')
  })
})
