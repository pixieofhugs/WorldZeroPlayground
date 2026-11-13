/**
 * #1702 — three vocabulary rulings the English catalog keeps. Some kits hold
 * copy inline (`EphemeristsProfileBody`, `UaProfileBody`), so source is scanned
 * too, comments stripped.
 *
 * 1. Level, never *grade*.
 * 2. No `↗` (emoji-renders on iOS). `▸` is faction voice: asserted PRESENT.
 * 3. UA counts points, not *marks* — scoped by key path (a `ua` segment), which
 *    keeps it off `wordmark` and the Ephemerists' keys.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { SRC_DIR, readStripped, sourceFiles, toRelative } from '../test/sourceScan'

const LOCALE_DIR = join(SRC_DIR, 'locales', 'en')

/** The word, never a fragment: `upgrade`/`degrade` are not this ruling. */
const GRADE = /\bgrades?\b/i
/** The word, never a fragment: `wordmark`/`markdown`/`marked` are protected. */
const MARK = /\bmarks?\b/i
const EMOJI_ARROW = '\u2197'
const TEXT_TRIANGLE = '\u25b8'

const catalogs = (): string[] => sourceFiles({ dir: LOCALE_DIR, match: /\.json$/ })

/** Every leaf string with its dotted key path. */
function leaves(node: unknown, path: string[] = []): Array<[string, string]> {
  if (typeof node === 'string') return [[path.join('.'), node]]
  if (Array.isArray(node)) return node.flatMap((item, index) => leaves(item, [...path, String(index)]))
  if (node && typeof node === 'object') {
    return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
      leaves(value, [...path, key]),
    )
  }
  return []
}

const catalogLeaves = (): Array<[string, string]> =>
  catalogs().flatMap((path) =>
    leaves(JSON.parse(readFileSync(path, 'utf8'))).map(
      ([key, value]) => [`${toRelative(path)}:${key}`, value] as [string, string],
    ),
  )

describe('a character has a level, never a grade (#1702)', () => {
  it('no catalog says grade — not in a string, not in a key', () => {
    const offenders = catalogs()
      .filter((path) => GRADE.test(readFileSync(path, 'utf8')))
      .map(toRelative)
    expect(offenders).toEqual([])
  })

  it('no component says grade outside a comment', () => {
    const offenders = sourceFiles()
      .filter((path) => GRADE.test(readStripped(path)))
      .map(toRelative)
    expect(offenders).toEqual([])
  })
})

describe('the arrow that emoji-renders on iOS is gone; the triangle is not (#1702)', () => {
  it('no catalog carries the north-east arrow', () => {
    const offenders = catalogs()
      .filter((path) => readFileSync(path, 'utf8').includes(EMOJI_ARROW))
      .map(toRelative)
    expect(offenders).toEqual([])
  })

  it('the right-pointing triangle survives — it is voice, not a dingbat to tidy', () => {
    const carriers = catalogs()
      .filter((path) => readFileSync(path, 'utf8').includes(TEXT_TRIANGLE))
      .map(toRelative)
    expect(carriers).toEqual(['locales/en/factions.json', 'locales/en/forms.json'])
  })
})

describe('the University of Asthmatics counts points, not marks (#1702)', () => {
  it('no UA-namespaced string says mark', () => {
    const offenders = catalogLeaves()
      .filter(([key, value]) => key.split(/[.:]/).includes('ua') && MARK.test(value))
      .map(([key, value]) => `${key} — ${value}`)
    expect(offenders).toEqual([])
  })

  it("UA's inline profile copy says it too — a locale grep cannot see this one", () => {
    const path = join(SRC_DIR, 'pages', 'characterProfile', 'archetypes', 'UaProfileBody.tsx')
    expect(MARK.test(readStripped(path))).toBe(false)
  })

  it('reads a non-empty set of UA keys, so the sweep cannot pass by finding nothing', () => {
    // Catalog half only; source-scan half is in `test/__tests__/sourceScan.test.ts`.
    // The floor tracks the catalog: lower it by exactly the UA keys a change retires.
    expect(catalogLeaves().filter(([key]) => key.split(/[.:]/).includes('ua')).length).toBeGreaterThanOrEqual(38)
  })
})
