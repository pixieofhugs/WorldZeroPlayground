/**
 * #1141 — modules that must not be reached by a static import from an eager
 * path.
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
 * `components/factionMarks` — the ornament (#2779). `Sidebar` draws
 * `FactionSigil` on every page, `FactionSigil` adapts `UaSigil`, and `UaSigil`
 * used to take its ensō from the folder's BARREL. A barrel is a static
 * re-export, so first paint paid for every name in it: `Lotus`,
 * `PointsRoundel`, and — through a re-export with zero consumers —
 * `CovenCauldron` and the whole `covenSlip` vocabulary behind it. 4.2 KB
 * gzipped of Coven and UA ornament, blocking, for one circle. Both rows above
 * ask "who imports X"; this one has to ask the other direction, because the
 * offending line was in a file that imports nothing wrong — it was REACHED.
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
 * The ornament row is the one case the budget CAN see — 4.2 KB moved. It still
 * cannot hold it: JS is over WARN (#2605) and WARN exits 0, so the number would
 * drift back up printing the same block it prints today, and nothing would go
 * red. A ratchet the budget cannot enforce is one this file can.
 *
 * Same posture as `noInjectedStylesheets.test.ts`: one assertion covers every
 * module, present and future, without instantiating any of them.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it, expect } from 'vitest'
// Shipped modules only — `sourceFiles` skips `__tests__` by default, which is
// what this file needs: a test's imports are never in a visitor's bundle, and
// this file names both guarded specifiers in its own fixtures.
import { SRC_DIR, sourceFiles, stripComments, toRelative } from '../test/sourceScan'

/**
 * Modules a file imports a runtime *value* from. `import type` is erased by
 * tsc and pulls no chunk, so it is not a finding. `import('...')` is deliberate
 * laziness and never matches — the leading `\s+` requires a clause.
 */
function valueImportSpecifiers(source: string): string[] {
  const specifiers: string[] = []
  const importClause = /import\s+(type\s+)?([\s\S]*?)\s*from\s*['"]([^'"]+)['"]/g
  for (const [, typeOnly, clause, specifier] of stripComments(source).matchAll(importClause)) {
    if (!typeOnly && !allInlineTypes(clause)) specifiers.push(specifier)
  }
  return specifiers
}

/** `import { type A, type B } from` is erased by tsc too, and pulls no chunk. */
function allInlineTypes(clause: string): boolean {
  return (
    clause.trim().startsWith('{') &&
    clause
      .replace(/[{}]/g, '')
      .split(',')
      .filter((binding) => binding.trim().length > 0)
      .every((binding) => binding.trim().startsWith('type '))
  )
}

/**
 * Everything a module pulls into its own chunk group: its value imports PLUS
 * its re-exports. `export { x } from './x'` is a static edge exactly like an
 * import — that is the whole of #2779 — and `valueImportSpecifiers` cannot see
 * it, so a barrel would otherwise look like a leaf.
 *
 * The clause is pinned to `{…}` / `*` rather than matched lazily, because
 * `export function f()` followed anywhere later by an `… from '…'` would
 * otherwise match across half a file.
 */
function staticEdges(source: string): string[] {
  const reExport = /export\s+(type\s+)?(\{[^}]*\}|\*(?:\s+as\s+\w+)?)\s*from\s*['"]([^'"]+)['"]/g
  const reExported = [...stripComments(source).matchAll(reExport)]
    .filter(([, typeOnly, clause]) => !typeOnly && !allInlineTypes(clause))
    .map(([, , , specifier]) => specifier)
  return [...valueImportSpecifiers(source), ...reExported]
}

/** A relative specifier as tsc resolves it, or null if it is not TS source. */
function resolveRelative(fromFile: string, specifier: string): string | null {
  const base = join(dirname(fromFile), specifier)
  return ['.ts', '.tsx', '/index.ts', '/index.tsx'].map((s) => base + s).find(existsSync) ?? null
}

/**
 * Every module the entry reaches WITHOUT crossing an `import()` — the graph the
 * browser must have in hand before it can paint. Bare specifiers stop the walk:
 * `node_modules` is not ours to split. `import()` never appears here because
 * `valueImportSpecifiers` declines to match it, which is the same reason it is
 * the right primitive for this.
 */
function eagerModules(): string[] {
  const seen = new Set<string>()
  const queue = [join(SRC_DIR, 'main.tsx')]
  while (queue.length > 0) {
    const path = queue.pop() as string
    if (seen.has(path)) continue
    seen.add(path)
    for (const specifier of staticEdges(readFileSync(path, 'utf8'))) {
      if (!specifier.startsWith('.')) continue
      const resolved = resolveRelative(path, specifier)
      if (resolved !== null) queue.push(resolved)
    }
  }
  return [...seen].map(toRelative).sort()
}

/** Files that legitimately hold a static import of the module under guard. */
function offendersFor(matches: RegExp, allowed: (path: string) => boolean): string[] {
  return sourceFiles()
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

describe('the faction ornament stays off the eager path (#2779)', () => {
  it('reaches one mark from the entry, and never the barrel behind it', () => {
    // `Enso` is legitimately blocking: `Sidebar` draws the sigil on first paint.
    // Everything else in the folder belongs to a lazy archetype, so it must be
    // reached BY PATH from that archetype — never through `factionMarks/index`,
    // whose every name would then ride along. If this list grows, the mark that
    // joined it is on the critical path for every visitor of every faction.
    expect(eagerModules().filter((path) => path.startsWith('components/factionMarks/'))).toEqual([
      'components/factionMarks/Enso.tsx',
    ])
  })
})

describe('the scan sees the codebase', () => {
  // The "reads a non-empty file set" half now lives once, with the shared walk,
  // in `src/test/__tests__/sourceScan.test.ts`. What stays here is the part
  // that is this file's own: the import parser.
  it('still recognises a static value import when it sees one', () => {
    expect(valueImportSpecifiers("import { a } from '../api/admin'")).toEqual(['../api/admin'])
    expect(valueImportSpecifiers("import type { A } from '../api/admin'")).toEqual([])
    expect(valueImportSpecifiers("import { type A } from '../api/admin'")).toEqual([])
    expect(valueImportSpecifiers("const m = await import('../api/admin')")).toEqual([])
  })
})
