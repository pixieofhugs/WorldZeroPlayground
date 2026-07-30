/**
 * #1209 — Cozy Coven speaks ONE identity.
 *
 * Coven ran two visual languages at once. The candlelit spell slip / ward
 * (`--faction-coven-slip-*`, `--faction-coven-ward-*`) is the live one, shipped
 * by the v2 task card (#1023), the task detail (#1031) and the praxis detail
 * (#1117). The lo-fi `coven.exe` window / pink marker sticker is retired, and
 * its token families were left declared in `index.css` because thirteen other
 * surfaces still painted with them — "a card metaphor swap is not a licence to
 * delete a token another archetype paints with".
 *
 * This is the guard that keeps that stop being true. A SOURCE SCAN rather than
 * a render, for `noInjectedStylesheets`' reason: the offending declaration is
 * usually inside a branch (`membership.state === 'gate'`, a `danger` copy
 * ternary, an empty-state) that no fixture reaches, so one assertion covers
 * every surface, present and future, without instantiating any of them.
 *
 * The families listed below are the retired ones ONLY. Deliberately absent:
 *
 *  • `--faction-coven-card-*` and `--faction-coven-light` / `-border` — the §3
 *    per-faction contract every faction supplies. `card-notice` is the
 *    sheet-measured warning ink the duel seals route to (#1168) and
 *    `card-accent` is what `factionCssVar` hands a foreign viewer.
 *  • `--faction-coven-moon-*` and `--faction-coven-vote-*` — `CovenVote`'s
 *    moon-phase plate stays, by decision on #1209. It is a night plate that
 *    reads in both themes and does not fight the ward.
 *
 * The declarations themselves stay in `index.css`; this test says nothing about
 * them. A token nobody reads costs a few bytes, and deleting a family is a
 * separate change from making it unread.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))

/** The retired `coven.exe` / marker-sticker token families, as a var-name prefix. */
const RETIRED = [
  '--faction-coven-win-',
  '--faction-coven-title-',
  '--faction-coven-body-bg',
  '--faction-coven-notepad-',
  '--faction-coven-scrap-',
  '--faction-coven-sticker-',
  '--faction-coven-stamp-',
  '--faction-coven-tape',
  '--faction-coven-dot',
  '--faction-coven-ivy',
  // The whimsy.exe aliases the faction-select tile reached for. Coven-only:
  // `FactionSelectCard`'s COVEN branch was the entire readership.
  '--gestalt-',
] as const

const RETIRED_PATTERN = new RegExp(
  RETIRED.map((name) => name.replace(/[-]/g, '\\-')).join('|'),
)

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry: string) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : sourceFiles(path)
    return /\.tsx?$/.test(entry) ? [path] : []
  })
}

/**
 * Docstrings legitimately NAME the retired families — `CovenTaskCard` explains
 * why they stayed declared, `CovenFeedFrame` says it is not deleting them, and
 * this file's own header lists all eleven. Only a declaration counts.
 */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

const toRelative = (path: string) => relative(SRC_DIR, path).split('\\').join('/')

describe('Cozy Coven wears one identity (#1209)', () => {
  it('no component paints with a retired coven.exe token', () => {
    const offenders = sourceFiles(SRC_DIR)
      .filter((path) => RETIRED_PATTERN.test(stripComments(readFileSync(path, 'utf8'))))
      .map(toRelative)
    expect(offenders).toEqual([])
  })

  it('scans a non-empty set, so the guard cannot pass by finding nothing', () => {
    expect(sourceFiles(SRC_DIR).length).toBeGreaterThan(100)
  })

  it('the slip and ward families are what the sweep moved TO, so they are read', () => {
    // Either directly, or through `components/factionMarks/covenSlip.tsx`, which is
    // where the marks used by more than one Coven surface are drawn.
    const readers = sourceFiles(SRC_DIR).filter((path) =>
      /--faction-coven-(slip|ward)-|factionMarks\/covenSlip/.test(stripComments(readFileSync(path, 'utf8'))),
    )
    // The reference implementations (task card, task detail, praxis detail,
    // comment voice, feed frame, composer) plus the swept surfaces and the kit
    // itself. A floor, not a census — it only has to fail if the sweep is
    // reverted or the kit is orphaned.
    //
    // 17 the day #1209 landed, 16 since #1313: retiring the `mobileDuelSeal`
    // SURFACE deleted `CovenMobileDuelSealConfirm`, which was one of these
    // readers. The sweep did not shrink — one file dresses the seal at both form
    // factors now — so the floor drops by exactly the file that went, no more.
    expect(readers.length).toBeGreaterThanOrEqual(16)
  })
})
