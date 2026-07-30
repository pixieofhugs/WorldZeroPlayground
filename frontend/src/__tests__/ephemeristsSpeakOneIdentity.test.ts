/**
 * #1208 — the Ephemerists speak ONE identity.
 *
 * The faction ran two visual languages at once. THE VALLEY PLATE
 * (`--faction-ephemerists-plate-*`, Poiret One / Cinzel / Spectral, the kit in
 * `components/cards/ephemeristsPlate.tsx`) is the live one, shipped by the v2
 * task card (#1023), the task detail (#1032), the praxis detail (#1120) and the
 * praxis card / score stamp / vote / metatask seal (#1207). THE CODEX — the
 * `--eph-*` illuminated-manuscript family: vellum, lapis, rubric, gold leaf,
 * Cinzel + EB Garamond — painted everything else, and `index.css` said so at the
 * plate block's declaration as a staging note.
 *
 * This is the guard that keeps that note from becoming true again. A SOURCE SCAN
 * rather than a render, for the reason the Coven sweep's twin gives (#1209): the
 * offending declaration usually sits inside a branch — `membership.state ===
 * 'gate'`, a `danger` copy ternary, an empty state, a `spotlight` flag — that no
 * fixture reaches, so one assertion covers every surface, present and future,
 * without instantiating any of them.
 *
 * The `--eph-*` DECLARATIONS stay in `index.css`, and this test says nothing
 * about them: two of them are still aliased by the `--faction-ephemerists-card-*`
 * contract every faction supplies (`card-bg`, `card-text`, `card-accent`,
 * `card-muted`, `card-font`, `body-font`), which the app reads through
 * `factionCssVar` on surfaces that are not Ephemerists skins at all. Deleting a
 * family is a separate change from making it unread.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))

/** The retired illuminated-codex family, as a var-name prefix. */
const RETIRED = /--eph-/

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry: string) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : sourceFiles(path)
    return /\.tsx?$/.test(entry) ? [path] : []
  })
}

/**
 * Docstrings legitimately NAME the retired family — the plate kit explains what
 * it is not, `EphemeristsFeedFrame` records that the two grounds must not be
 * mixed, and this file's own header names it four times. Only a declaration
 * counts.
 */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

const toRelative = (path: string) => relative(SRC_DIR, path).split('\\').join('/')

describe('the Ephemerists wear one identity (#1208)', () => {
  it('no component paints with a retired codex token', () => {
    const offenders = sourceFiles(SRC_DIR)
      .filter((path) => RETIRED.test(stripComments(readFileSync(path, 'utf8'))))
      .map(toRelative)
    expect(offenders).toEqual([])
  })

  it('scans a non-empty set, so the guard cannot pass by finding nothing', () => {
    expect(sourceFiles(SRC_DIR).length).toBeGreaterThan(100)
  })

  it('the plate family is what the sweep moved TO, so it is read', () => {
    // Either directly, or through `components/cards/ephemeristsPlate.tsx`, which
    // is where a mark used by more than one Ephemerists surface is drawn.
    const readers = sourceFiles(SRC_DIR).filter((path) =>
      /--faction-ephemerists-plate-|cards\/ephemeristsPlate/.test(
        stripComments(readFileSync(path, 'utf8')),
      ),
    )
    // The reference implementations (task card, task detail, praxis detail,
    // praxis card, score stamp, vote, seal, comment voice, feed frame) plus the
    // swept surfaces and the kit itself — 18 files the day the sweep landed, 17
    // since #1313. A floor, not a census: it only has to fail if the sweep is
    // reverted or the kit is orphaned.
    //
    // It DOES move when a surface is RETIRED, which the previous wording denied:
    // #1313 deleted `EphemeristsMobileDuelSealConfirm` along with the
    // `mobileDuelSeal` surface, and that file was one of these readers. One file
    // dresses the seal at both form factors now, so the floor drops by exactly
    // the one that went, and by no more.
    expect(readers.length).toBeGreaterThanOrEqual(17)
  })
})
