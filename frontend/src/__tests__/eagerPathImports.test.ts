/**
 * #1141 — two modules that must not be reached by a static import from an
 * eager path.
 *
 * `api/admin` — `TaskCard` imported `updateTaskStatus` at module scope, so the
 * built `admin-*.js` chunk was fetched by every logged-out visitor on `/tasks`
 * for a call site guarded by `user?.is_admin && adminMode`. Failure mode 1 in
 * `docs/agents/load-time.md`.
 *
 * `api/gameConfig`'s `getGameConfig` — `hooks/useGameConfig` already dedupes
 * `/game-config` behind a module-level cache plus a shared in-flight promise,
 * so a direct caller costs a second request for a payload already in hand.
 *
 * WHY A SOURCE SCAN AND NOT THE BUNDLE BUDGET
 * -------------------------------------------
 * `npm run budget` measures the critical path — the entry chunk plus what
 * `index.html` modulepreloads. `admin-*.js` was never on it; it was pulled a
 * layer later by the lazy `Tasks` chunk, so the budget number does not move in
 * either direction and cannot detect this regression. The condition that
 * actually matters ("nothing outside the admin route reaches this module
 * statically") is a property of the source, and CI runs vitest before the
 * build, so this is both the honest seam and the only one available per-PR.
 *
 * Same posture as `noInjectedStylesheets.test.ts`: one assertion covers every
 * module, present and future, without instantiating any of them.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))

/** Shipped modules only — a test's imports are never in a visitor's bundle,
 *  and this file names both guarded specifiers in its own fixtures. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry: string) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : sourceFiles(path)
    return /\.tsx?$/.test(entry) ? [path] : []
  })
}

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

const toRelative = (path: string) => relative(SRC_DIR, path).split('\\').join('/')

/**
 * Modules a file imports a runtime *value* from. `import type` is erased by
 * tsc and pulls no chunk, so it is not a finding. `import('...')` is deliberate
 * laziness and never matches — the leading `\s+` requires a clause.
 */
function valueImportSpecifiers(source: string): string[] {
  const specifiers: string[] = []
  const importClause = /import\s+(type\s+)?([\s\S]*?)\s*from\s*['"]([^'"]+)['"]/g
  for (const [, typeOnly, clause, specifier] of stripComments(source).matchAll(importClause)) {
    // `import { type A, type B } from` is erased too.
    const allInlineTypes =
      clause.trim().startsWith('{') &&
      clause
        .replace(/[{}]/g, '')
        .split(',')
        .filter((binding) => binding.trim().length > 0)
        .every((binding) => binding.trim().startsWith('type '))
    if (!typeOnly && !allInlineTypes) specifiers.push(specifier)
  }
  return specifiers
}

/** Files that legitimately hold a static import of the module under guard. */
function offendersFor(matches: RegExp, allowed: (path: string) => boolean): string[] {
  return sourceFiles(SRC_DIR)
    .filter((path) => valueImportSpecifiers(readFileSync(path, 'utf8')).some((s) => matches.test(s)))
    .map(toRelative)
    .filter((path) => !allowed(path))
}

describe('api/admin stays off the eager path (#1141)', () => {
  it('is statically imported only by the lazy admin route', () => {
    // Anywhere else, move the call behind `await import('../api/admin')` inside
    // the handler — the chunk is then fetched when a moderator acts.
    expect(offendersFor(/\/api\/admin$/, (path) => path.startsWith('pages/admin/'))).toEqual([])
  })
})

describe('/game-config is fetched once per load (#1141)', () => {
  it('routes every consumer through useGameConfig', () => {
    expect(
      offendersFor(/\/api\/gameConfig$/, (path) => path === 'hooks/useGameConfig.ts').filter((path) => {
        // Type-shape consumers are fine; only the fetch function is deduped.
        const source = readFileSync(join(SRC_DIR, path), 'utf8')
        return /\bgetGameConfig\b/.test(stripComments(source))
      }),
    ).toEqual([])
  })
})

describe('the scan sees the codebase', () => {
  it('reads a non-empty file set, so it cannot pass by finding nothing', () => {
    expect(sourceFiles(SRC_DIR).length).toBeGreaterThan(100)
  })

  it('still recognises a static value import when it sees one', () => {
    expect(valueImportSpecifiers("import { a } from '../api/admin'")).toEqual(['../api/admin'])
    expect(valueImportSpecifiers("import type { A } from '../api/admin'")).toEqual([])
    expect(valueImportSpecifiers("import { type A } from '../api/admin'")).toEqual([])
    expect(valueImportSpecifiers("const m = await import('../api/admin')")).toEqual([])
  })
})
