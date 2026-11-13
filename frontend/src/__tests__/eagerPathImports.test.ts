/**
 * #1141 — modules that must not be reached by a static import from an eager
 * path (`docs/agents/load-time.md`, failure mode 1).
 *
 * - `api/admin`: only the lazy admin route may import it statically.
 * - `getGameConfig`: `useGameConfig` dedupes `/game-config`; a direct call refetches.
 * - `factionMarks` (#2779): only `Enso` is reachable from the entry — a barrel
 *   import drags every mark onto first paint. Checked by walking the graph.
 *
 * A source scan because `npm run budget` misses lazy-chunk pulls, and where it
 * does see weight it can't hold it (JS is over WARN, which exits 0 — #2605).
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { SRC_DIR, sourceFiles, stripComments, toRelative } from '../test/sourceScan'

/** Runtime value imports only; `import type` is erased, `import()` never matches. */
function valueImportSpecifiers(source: string): string[] {
  const specifiers: string[] = []
  const importClause = /import\s+(type\s+)?([\s\S]*?)\s*from\s*['"]([^'"]+)['"]/g
  for (const [, typeOnly, clause, specifier] of stripComments(source).matchAll(importClause)) {
    if (!typeOnly && !allInlineTypes(clause)) specifiers.push(specifier)
  }
  return specifiers
}

/** `import { type A, type B } from` is erased too. */
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
 * Value imports plus re-exports (a re-export is a static edge too, #2779).
 * Clause pinned to `{…}`/`*`, else `export function` would match across the file.
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

/** Every module the entry reaches without crossing an `import()`; bare specifiers stop the walk. */
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

/** Files statically importing a guarded module, minus the allowed ones. */
function offendersFor(matches: RegExp, allowed: (path: string) => boolean): string[] {
  return sourceFiles()
    .filter((path) => valueImportSpecifiers(readFileSync(path, 'utf8')).some((s) => matches.test(s)))
    .map(toRelative)
    .filter((path) => !allowed(path))
}

describe('api/admin stays off the eager path (#1141)', () => {
  it('is statically imported only by the lazy admin route', () => {
    // Elsewhere: `await import('../api/admin')` inside the handler.
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
    // `Enso` is blocking by design (Sidebar's sigil). Other marks: import by
    // path from their lazy archetype, never via `factionMarks/index`.
    expect(eagerModules().filter((path) => path.startsWith('components/factionMarks/'))).toEqual([
      'components/factionMarks/Enso.tsx',
    ])
  })
})

describe('the event popups stay off the eager path (#2843)', () => {
  it('reaches the watchers from the entry, and never the popup behind one', () => {
    // The watchers in `Layout` are eager by design; the rarely-shown popups
    // they render must be lazy.
    expect(
      eagerModules().filter((path) => /Popup\.tsx$/.test(path)),
    ).toEqual([])
  })
})

describe('the scan sees the codebase', () => {
  // The non-empty-walk check is in `test/__tests__/sourceScan.test.ts`.
  it('still recognises a static value import when it sees one', () => {
    expect(valueImportSpecifiers("import { a } from '../api/admin'")).toEqual(['../api/admin'])
    expect(valueImportSpecifiers("import type { A } from '../api/admin'")).toEqual([])
    expect(valueImportSpecifiers("import { type A } from '../api/admin'")).toEqual([])
    expect(valueImportSpecifiers("const m = await import('../api/admin')")).toEqual([])
  })
})
