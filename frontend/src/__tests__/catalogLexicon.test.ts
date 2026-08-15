/**
 * #1702 — three vocabulary rulings the English catalog has to keep.
 *
 * Each of the three is a word that shipped, was ruled against, and would come
 * back the next time a faction kit is written from the one beside it. They live
 * in one guard because they live in one pair of files (`feed.json`,
 * `factions.json`) and a locale grep for any one of them re-reads the others.
 *
 * THE SEAM IS THE CATALOG PLUS THE COPY THAT NEVER REACHED IT. Two archetype
 * kits hold user-facing strings inline — `EphemeristsProfileBody`'s ring label
 * and `next · …` template literal, `UaProfileBody`'s level unit and empty
 * states — and a `locales/` grep is blind to all of them. That blindness is what
 * let the first pass on this issue miss two sites, so the code half is scanned
 * with comments stripped, exactly as `ephemeristsSpeakOneIdentity` does: a
 * docstring may name a retired word, a rendered string may not.
 *
 * 1. GRADE IS LEVEL. The Ephemerists called a character's level a *grade* — in
 *    the catalog, in the `{{grade}}` interpolation variable, and in a `grade()`
 *    helper feeding both. The roman numeral stays; the word does not.
 * 2. THE NORTH-EAST ARROW IS GONE. `↗` renders as a colour emoji on iOS rather
 *    than a text glyph. The small right-pointing triangle `▸` does NOT, and is
 *    deliberate faction voice — so it is asserted PRESENT, to stop a later
 *    tidy-up from reading this rule as "strip the dingbats".
 * 3. UA COUNTS POINTS. The University of Asthmatics counted *marks*. The ruling
 *    covers every instance of the word in UA's copy, not just the counters. It
 *    is scoped by KEY PATH rather than by string, which is what keeps it off the
 *    Ephemerists' kanji keys and every `wordmark` — neither sits under a `ua`
 *    segment. `votes.json`'s `Mark {{value}}` DOES, and is exempted by name
 *    below, for a reason that is about grammar rather than about UA.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))
const LOCALE_DIR = join(SRC_DIR, 'locales', 'en')

/** The word, never a fragment: `upgrade`/`degrade` are not this ruling. */
const GRADE = /\bgrades?\b/i
/** The word, never a fragment: `wordmark`/`markdown`/`marked` are protected. */
const MARK = /\bmarks?\b/i
const EMOJI_ARROW = '\u2197'
const TEXT_TRIANGLE = '\u25b8'

const catalogs = (): string[] =>
  readdirSync(LOCALE_DIR)
    .filter((entry) => entry.endsWith('.json'))
    .map((entry) => join(LOCALE_DIR, entry))

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry: string) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : sourceFiles(path)
    return /\.tsx?$/.test(entry) ? [path] : []
  })

/** Docstrings may name a retired word; only what ships to a screen counts. */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

const toRelative = (path: string) => relative(SRC_DIR, path).split('\\').join('/')

/** Every leaf string in a catalog, paired with the dotted key path that reaches it. */
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
    const offenders = sourceFiles(SRC_DIR)
      .filter((path) => GRADE.test(stripComments(readFileSync(path, 'utf8'))))
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
    expect(carriers).toEqual(['locales/en/factions.json', 'locales/en/feed.json', 'locales/en/forms.json'])
  })
})

/**
 * The one UA-namespaced string the ruling exempts. `Mark {{value}}` is the
 * accessible name of a star-rating control, where *mark* is the imperative verb
 * — "mark this three" — and not the unit being counted. Renaming it would make
 * the aria-label describe the score rather than the action.
 */
const VERB_NOT_UNIT = 'locales/en/votes.json:chrome.ua.rateAria'

describe('the University of Asthmatics counts points, not marks (#1702)', () => {
  it('no UA-namespaced string says mark', () => {
    const offenders = catalogLeaves()
      .filter(([key]) => key !== VERB_NOT_UNIT)
      .filter(([key, value]) => key.split(/[.:]/).includes('ua') && MARK.test(value))
      .map(([key, value]) => `${key} — ${value}`)
    expect(offenders).toEqual([])
  })

  it("UA's inline profile copy says it too — a locale grep cannot see this one", () => {
    const path = join(SRC_DIR, 'pages', 'characterProfile', 'archetypes', 'UaProfileBody.tsx')
    expect(MARK.test(stripComments(readFileSync(path, 'utf8')))).toBe(false)
  })

  it('scans a non-empty set, so neither sweep can pass by finding nothing', () => {
    expect(catalogLeaves().filter(([key]) => key.split(/[.:]/).includes('ua')).length).toBeGreaterThan(50)
    expect(sourceFiles(SRC_DIR).length).toBeGreaterThan(100)
  })
})
