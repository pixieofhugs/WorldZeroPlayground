/**
 * Retired skins must not leave corpses.
 *
 * ADR-0056 / 0058 / 0063 / 0065 / 0067 / 0069 each collapsed a surface that used
 * to be a desktop/mobile PAIR down to one responsive component per faction. Each
 * collapse deletes manifest rows — and `surfaceDispatch.test.ts` catches that,
 * because its BESPOKE table flips red when a slug de-registers.
 *
 * What nothing catches is the FILE. De-registering a skin removes the manifest
 * line; it does not remove `WowEditPraxisMobile.tsx`. The orphan still
 * compiles, still passes `tsc`, still passes lint, and still passes every render
 * test — because no test renders a component no dispatcher can reach. It is
 * invisible until someone greps for a component name and finds two.
 *
 * The two guards below are the ones that go red in that situation:
 *
 *   1. an archetype file nothing outside itself names — a skin whose manifest row
 *      was deleted while the module stayed on disk;
 *   2. a declared surface no dispatcher reads — a whole tier retired at the
 *      registry while every faction's implementation of it stayed.
 *
 * Both are SOURCE scans, not graph walks, and that is deliberate: a graph walk
 * asks "what does the manifest resolve to", which cannot see a file the manifest
 * has already forgotten. Only the filesystem remembers the corpse.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, basename, relative, sep } from 'node:path'

import { SURFACE_KEYS } from '..'

const SRC = join(process.cwd(), 'src')

/** Directories whose contents are dispatched skins rather than plain modules. */
const SKIN_DIRS = ['archetypes', 'mobileArchetypes', 'voices', 'skins']

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const ALL_FILES = walk(SRC).filter((path) => /\.tsx?$/.test(path))
const IS_TEST = (path: string) => /\.test\.tsx?$/.test(path) || path.includes(`${sep}__tests__${sep}`)

/** Every dispatched skin on disk: a non-test module inside a skin directory. */
const SKIN_FILES = ALL_FILES.filter(
  (path) => !IS_TEST(path) && SKIN_DIRS.some((dir) => path.includes(`${sep}${dir}${sep}`)),
)

/**
 * Production source only. A retired skin usually keeps its own render test for a
 * while, and counting that as a reference would let the corpse hold itself alive
 * — the exact failure this file exists to catch.
 */
const PROD_FILES = ALL_FILES.filter((path) => !IS_TEST(path))
const SOURCE = new Map(PROD_FILES.map((path) => [path, readFileSync(path, 'utf8')]))

describe('archetype reachability', () => {
  it('has skin files to check at all', () => {
    // Guards the guard: a walk that silently matches nothing would make both
    // assertions below vacuously green forever.
    expect(SKIN_FILES.length).toBeGreaterThan(50)
  })

  it('every dispatched skin is named by something other than itself', () => {
    const orphans = SKIN_FILES.filter((path) => {
      const name = basename(path).replace(/\.tsx?$/, '')
      // Bounded by a quote or a path separator so `WowSeal` cannot be kept alive
      // by `WowSealConfirm`. Import specifiers are extensionless, so the closing
      // quote is the end of the name.
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
        // The manifest DECLARES the key and the index iterates it generically;
        // neither is a dispatcher, so neither may satisfy this.
        if (path.includes(`${sep}factions${sep}`)) continue
        if (call.test(text)) return false
      }
      return true
    })

    expect([...unread].sort()).toEqual([])
  })
})
