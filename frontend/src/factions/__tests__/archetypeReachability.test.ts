/**
 * Retired skins must not leave corpses. Collapsing a desktop/mobile pair
 * (ADR-0056 etc.) removes manifest rows, but an orphaned file still compiles,
 * lints and passes. Fails on (1) a skin file nothing else names, (2) a declared
 * surface no dispatcher reads. Source scans on purpose: a graph walk from the
 * manifest cannot see a file it has forgotten.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, basename, relative, sep } from 'node:path'

import { SURFACE_KEYS } from '..'
import { sourceFiles } from '../../test/sourceScan'

const SRC = join(process.cwd(), 'src')

const SKIN_DIRS = ['archetypes', 'mobileArchetypes', 'voices', 'skins']

// IS_TEST also catches `.test.tsx?` outside `__tests__`, which the default misses.
const ALL_FILES = sourceFiles({ dir: SRC, includeTests: true, match: /\.tsx?$/ })
const IS_TEST = (path: string) => /\.test\.tsx?$/.test(path) || path.includes(`${sep}__tests__${sep}`)

const SKIN_FILES = ALL_FILES.filter(
  (path) => !IS_TEST(path) && SKIN_DIRS.some((dir) => path.includes(`${sep}${dir}${sep}`)),
)

/** Production only: a retired skin's own test must not keep it alive. */
const PROD_FILES = ALL_FILES.filter((path) => !IS_TEST(path))
const SOURCE = new Map(PROD_FILES.map((path) => [path, readFileSync(path, 'utf8')]))

describe('archetype reachability', () => {
  it('has skin files to check at all', () => {
    // Guards the guard against a vacuous walk.
    expect(SKIN_FILES.length).toBeGreaterThan(50)
  })

  it('every dispatched skin is named by something other than itself', () => {
    const orphans = SKIN_FILES.filter((path) => {
      const name = basename(path).replace(/\.tsx?$/, '')
      // Quote/separator bounds so `WowSealConfirm` cannot keep `WowSeal` alive.
      const named = new RegExp(`['"/]${name}['"]`)
      for (const [other, text] of SOURCE) {
        if (other !== path && named.test(text)) return false
      }
      return true
    })

    expect(orphans.map((path) => relative(SRC, path)).sort()).toEqual([])
  })

  it('every declared surface has a dispatcher that reads it', () => {
    const unread = SURFACE_KEYS.filter((key) => {
      const call = new RegExp(`surfaceMap\\(\\s*['"]${key}['"]`)
      for (const [path, text] of SOURCE) {
        // factions/ declares and iterates keys; it is not a dispatcher.
        if (path.includes(`${sep}factions${sep}`)) continue
        if (call.test(text)) return false
      }
      return true
    })

    expect([...unread].sort()).toEqual([])
  })
})
