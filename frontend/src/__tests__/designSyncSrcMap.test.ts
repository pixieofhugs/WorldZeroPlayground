/**
 * #1405 — every `componentSrcMap` value in `.design-sync/config.json` names a
 * file that actually exists, matched case-exactly.
 *
 * `componentSrcMap` is the export contract for `/design-sync`: it pins one
 * source path per published component name. A stale entry is silent. Nothing
 * renders it, nothing imports it, and the sync republishes a path that no
 * longer resolves — so the design system's view of the component tree drifts
 * from the tree. The map had rotted to 39 unresolved of 126 before anyone
 * measured it, and the only reason it was ever noticed is that an agent went
 * looking.
 *
 * WHY A GUARD AND NOT A GENERATOR
 * -------------------------------
 * The obvious fix is to derive the map from the filesystem and delete the hand
 * maintenance. It does not survive contact with the data. The map is a curated
 * selection, not a path index:
 *
 *   - it publishes 253 of 309 candidate `.tsx` files — the other 56 are
 *     deliberately not in the kit, and a walk cannot infer that intent;
 *   - several entries are aliases whose key is not the file's basename
 *     (`BackdropProvider` → `BackdropContext.tsx`, `CommentFlagControl` →
 *     `FlagControl.tsx`);
 *   - two of those aliases — `VoteLoginGate` and `VoteSummary` — point at the
 *     *same* file, `vote/VoteShell.tsx`. A filesystem walk yields one name per
 *     file and can never produce a many-to-one mapping.
 *
 * So the names are a human decision and stay hand-written. What was missing was
 * never the derivation, it was the check: a hand-written map with no guard
 * re-grows this backlog on the next rename wave. That makes this a ratchet
 * problem, and the ratchet is the deliverable.
 *
 * WHY CASE-EXACT, AND WHY NOT `existsSync`
 * ----------------------------------------
 * `existsSync` is case-insensitive on Windows and on macOS's default volume, so
 * a mis-cased entry passes on a contributor's machine and fails only on Linux
 * CI — or, worse, passes everywhere and silently publishes a path the design
 * system cannot fetch. The `UA`→`Ua` / `SNIDE`→`Snide` sweep (#1315) produced
 * exactly eight of these. `readdirSync` reports the real on-disk casing, so
 * membership in a set built from it is a case-exact test on every platform.
 *
 * WHY THIS LIVES IN `frontend/src/__tests__`
 * ------------------------------------------
 * Both files this guards — `.design-sync/config.json` and `.ds-kit/index.tsx`
 * — sit outside `tsconfig`'s `include: ["src"]`, so CI's `tsc --noEmit` never
 * looks at either (#1328). Vitest is the one CI step that can: it runs from
 * `frontend/`, in node, with the whole repo on disk, so a test under `src/`
 * can read them. That is the only reason this file is here rather than next
 * to the things it guards.
 *
 * This does NOT close #1328. That issue is about the preview `.tsx` files
 * failing *typecheck* — a different failure needing tsc coverage of
 * `.design-sync/previews/`. The two share a root cause (that whole area is
 * outside every CI net) but not a fix: this guard resolves paths and
 * typechecks nothing, so it would not catch a preview whose props drifted.
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

/**
 * Real on-disk casing — see the case-exactness note above. Every file, of
 * every extension, `__tests__` included: the map can pin any of them, so the
 * walk must not pre-filter by name the way the default does.
 */
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
    // A failure here means a rename or a surface collapse moved a file and left
    // the map behind. Repoint the entry, or drop it if the component is gone.
    const unresolved = pinned
      .filter(([, path]) => !realPaths.has(path))
      .map(([name, path]) => `${name} -> ${path}`)
    expect(unresolved).toEqual([])
  })

  it('re-exports only real files from the committed barrel', () => {
    // `.ds-kit/index.tsx` is generated from componentSrcMap by
    // `.design-sync/gen-barrel.mjs` — but it is COMMITTED, so it drifts with
    // the map and holds the same dead paths as genuine broken imports. Its own
    // header calls it gitignored; it is not. Nothing catches that today:
    // `.ds-kit/` is outside `tsconfig`'s `include: ["src"]` so tsc skips it,
    // and no app module imports it so `vite build` never resolves it either.
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
    // `overrides` is keyed by the same names, so deleting an entry from one map
    // orphans the other. Dead settings here are silently ignored by the sync —
    // the same invisible rot, one keystroke away.
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
