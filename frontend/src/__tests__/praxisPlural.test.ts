/**
 * #1136 — the plural of *praxis* is *praxis*, and the rename must not have
 * touched the API.
 *
 * THE TRAP THIS GUARD EXISTS FOR
 * ------------------------------
 * `/praxes/{id}` is spelled identically as the **frontend route** and as the
 * **backend API path**. #1136 renamed the route to `/praxis/{id}` and left the
 * API alone. A find/replace that does not tell them apart renames the endpoints
 * too — and then every request 404s while the app still builds, still
 * typechecks, and still passes every test that does not hit the network. The
 * repo's harness is `renderToStaticMarkup` only, so *nothing else here can see
 * that failure*. Hence a source scan.
 *
 * The discriminator is the directory: everything under `api/` is an API path
 * and stays `/praxes`; a `/praxes` anywhere else is a router path and is a
 * regression. Comments are stripped first, because prose that documents a
 * backend endpoint (`GET /praxes/{id}/voters`) is describing the API correctly
 * and is not a finding. Import specifiers are stripped too — `pages/praxes/` is
 * a real directory, and renaming directories is out of scope for #1136.
 */
import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, it, expect } from 'vitest'
// `includeTests` is on: this sweep is about every `/praxes` in the tree, and it
// excuses its own fixtures by name (FIXTURE_FILES) rather than by directory.
import { SRC_DIR, sourceFiles, stripComments, toRelative } from '../test/sourceScan'

const LOCALES_DIR = join(SRC_DIR, 'locales', 'en')

const allSource = () => sourceFiles({ includeTests: true })

/**
 * `pages/praxes/` is a real source directory — an import specifier, or a plain
 * path string a source-scanning test reads a file by. Renaming directories is
 * out of scope for #1136, so those are not findings.
 *
 * A route segment after `/praxes/` is always `:id` or `${...}` or a number; a
 * letter there means a filesystem path.
 */
const stripModulePaths = (source: string) =>
  source
    // `import { x } from './praxis'` is the api/praxis.ts MODULE, not a URL.
    .replace(/from\s*['"][^'"]+['"]/g, 'from ""')
    .replace(/import\s*\(\s*['"][^'"]+['"]\s*\)/g, 'import("")')
    // `readFileSync('../../pages/praxes/usePraxes.ts')` is a path on disk.
    .replace(/praxes\/(?=[A-Za-z_])/g, 'DIR/')

const routePaths = (source: string) => stripModulePaths(stripComments(source))

/**
 * These files spell the forbidden path in their own fixtures — they assert
 * that `/praxes` is rejected, so they have to name it to do so.
 */
const FIXTURE_FILES = new Set([
  '__tests__/praxisPlural.test.ts',
  '__tests__/measureLoadRoutes.test.ts',
])

describe('the API keeps saying /praxes (#1136)', () => {
  /**
   * Shipped client modules only. `api/__tests__/sessionRedirect.test.ts` holds
   * both kinds at once — `shouldReturnToLanding(status, requestUrl, pathname)`
   * takes an API URL *and* a `window.location.pathname` — so a route path in
   * there is correct, not a regression. Nothing under `__tests__` issues a
   * request, which is what this rule is about.
   */
  const apiFiles = sourceFiles({ dir: join(SRC_DIR, 'api'), includeTests: true }).filter(
    (path) => !toRelative(path).startsWith('api/__tests__/'),
  )

  it('never requests the frontend route path /praxis', () => {
    // If this fails, a rename crossed the seam: the client is now calling an
    // endpoint the backend does not serve. Put `/praxes` back.
    const offenders = apiFiles
      .filter((path) => /\/praxis(?=[/'"`?])/.test(routePaths(readFileSync(path, 'utf8'))))
      .map(toRelative)
    expect(offenders).toEqual([])
  })

  it('still holds the API paths it is supposed to hold', () => {
    // Guards the guard: were api/ emptied of /praxes, the assertion above would
    // pass by finding nothing at all.
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
        (path) => !toRelative(path).startsWith('api/') && !FIXTURE_FILES.has(toRelative(path)),
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
  // "reads a non-empty file set" is asserted once, with the shared walk, in
  // `src/test/__tests__/sourceScan.test.ts`. The stripper below is this file's
  // own — it strips MODULE PATHS as well as comments — so it is tested here.
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
