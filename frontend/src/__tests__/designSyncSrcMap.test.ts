/**
 * #1405 — every `componentSrcMap` value in `.design-sync/config.json` names a
 * file that exists, case-exactly. A stale entry is silent: the sync republishes
 * a dead path.
 *
 * Not generated from the filesystem: the map is curated (deliberate omissions,
 * aliases, two names → one file), so it stays hand-written and this is its ratchet.
 * Case-exact via a directory walk, not `existsSync`, which is case-insensitive on
 * Windows/macOS. Lives under `src/` because both guarded files sit outside tsc's
 * `include` (#1328) — it resolves paths only, typechecks nothing.
 */
import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

import { sourceFiles } from '../test/sourceScan'

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const FRONTEND_DIR = join(REPO_ROOT, 'frontend')
const CONFIG_PATH = join(REPO_ROOT, '.design-sync', 'config.json')

/** Map values are relative to `frontend/`, POSIX-separated. */
const toMapPath = (path: string) => relative(FRONTEND_DIR, path).split('\\').join('/')

/** Real on-disk casing; every file incl. tests, since the map can pin any. */
const realPaths = new Set(
  sourceFiles({ dir: join(FRONTEND_DIR, 'src'), includeTests: true, match: /./ }).map(toMapPath),
)

const componentSrcMap: Record<string, string | null> = JSON.parse(
  readFileSync(CONFIG_PATH, 'utf8'),
).componentSrcMap

/** A `null` value excludes a name from the kit and pins no path. */
const pinned = Object.entries(componentSrcMap).filter(
  (entry): entry is [string, string] => entry[1] !== null,
)

/** Per-component render settings (`cardMode`, `viewport`), keyed by the same names. */
const overrides: Record<string, unknown> = JSON.parse(
  readFileSync(CONFIG_PATH, 'utf8'),
).overrides

describe('componentSrcMap stays in sync with the tree (#1405)', () => {
  it('pins every published component at a path that exists, case-exactly', () => {
    // On failure: repoint the entry, or drop it if the component is gone.
    const unresolved = pinned
      .filter(([, path]) => !realPaths.has(path))
      .map(([name, path]) => `${name} -> ${path}`)
    expect(unresolved).toEqual([])
  })

  it('re-exports only real files from the committed barrel', () => {
    // The barrel is generated but committed, and neither tsc nor vite sees it.
    // Regenerate with `node .design-sync/gen-barrel.mjs` when this fails.
    const barrel = readFileSync(join(FRONTEND_DIR, '.ds-kit', 'index.tsx'), 'utf8')
    const unresolved = [...barrel.matchAll(/from\s+'([^']+)'|from\s+"([^"]+)"/g)]
      .map(([, single, double]) => single ?? double)
      // `./provider` is hand-written and sits beside the barrel, not under src/.
      .filter((specifier) => specifier.startsWith('../'))
      .map((specifier) => `${specifier.replace(/^\.\.\//, '')}.tsx`)
      .filter((path) => !realPaths.has(path))
    expect(unresolved).toEqual([])
  })

  it('carries no render override for a component the kit does not publish', () => {
    // Same keys as the map; the sync silently ignores orphans.
    const names = new Set(pinned.map(([name]) => name))
    expect(Object.keys(overrides).filter((name) => !names.has(name))).toEqual([])
  })
})

describe('the scan sees the codebase', () => {
  it('reads a non-empty file set, so it cannot pass by finding nothing', () => {
    expect(realPaths.size).toBeGreaterThan(100)
  })

  it('reads a non-empty map, so a bad parse cannot pass vacuously', () => {
    expect(pinned.length).toBeGreaterThan(100)
  })

  it('distinguishes casing, so a mis-cased entry cannot pass on Windows', () => {
    const mixedCase = pinned.map(([, path]) => path).find((path) => path !== path.toUpperCase())
    if (!mixedCase) throw new Error('no mixed-case path to probe with')
    expect(realPaths.has(mixedCase)).toBe(true)
    expect(realPaths.has(mixedCase.toUpperCase())).toBe(false)
  })
})
