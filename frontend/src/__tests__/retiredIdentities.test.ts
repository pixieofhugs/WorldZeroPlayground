/**
 * Each faction speaks ONE visual identity — the retired-token sweep.
 *
 * Three factions have had a visual language retired under them, and each
 * retirement shipped as its own copy of the same test: walk `frontend/src`,
 * fail on any file that still reaches for the dead token family. They are one
 * table now (#1209 Coven, #1208 Ephemerists, #1708 SNIDE). A fourth retirement
 * is a row, not a file.
 *
 * A SOURCE SCAN rather than a render, for all three: the offending declaration
 * usually sits inside a branch — `membership.state === 'gate'`, a `danger` copy
 * ternary, an empty state, a `spotlight` flag, the composer's waiting stage —
 * that no fixture reaches. One assertion covers every surface, present and
 * future, without instantiating any of them.
 *
 * These guards say nothing about the token DECLARATIONS, which is exactly why
 * they survived #1661 thinning `index.css`: they guard the NAMES, so they go on
 * failing if a component reaches for one whether or not anything declares it.
 *
 * Comments are stripped first. Docstrings legitimately NAME the retired
 * families — `CovenTaskCard` explains why they stayed declared, the Ephemerists
 * plate kit explains what it is not, several SNIDE headers say what came off,
 * and this file's own header does it three times. Only a draw call counts.
 */
import { describe, it, expect } from 'vitest'
import { readStripped, sourceFiles, toRelative, type ScanOptions } from '../test/sourceScan'

interface Retirement {
  /** Faction, and the issue that retired the language. */
  readonly name: string
  /** Every form of the dead family, as one pattern. */
  readonly retired: RegExp
  /**
   * What the sweep moved TO, where there was somewhere to move. Asserted to
   * have at least one reader, so that deleting the live kit outright cannot
   * read as "no offenders, all green".
   *
   * Deliberately not a count: the census floors this replaced (16, 17) were
   * hand-adjusted every time a surface was retired — #1313 dropped both by one
   * — and a number that tracks the file tree is a maintenance tax, not a guard.
   * "Reverted" is what the offenders assertion catches; "orphaned" is this one.
   *
   * Absent for a retirement that replaced the thing with NOTHING: SNIDE's tape
   * came off and no family took its place, so there is no kit to orphan.
   */
  readonly live?: RegExp
  readonly scan?: ScanOptions
}

const RETIREMENTS: readonly Retirement[] = [
  {
    // #1209 — Cozy Coven ran two visual languages at once. The candlelit spell
    // slip / ward is the live one, shipped by the v2 task card (#1023), the task
    // detail (#1031) and the praxis detail (#1117). The lo-fi `coven.exe` window
    // and pink marker sticker are retired.
    //
    // Deliberately NOT retired: `--faction-coven-card-*` and
    // `--faction-coven-light` / `-border` are the §3 per-faction contract every
    // faction supplies (`card-notice` is the sheet-measured warning ink the duel
    // seals route to, #1168; `card-accent` is what `factionCssVar` hands a
    // foreign viewer). `--faction-coven-moon-*` and `--faction-coven-vote-*`
    // stay too — `CovenVote`'s moon-phase plate was kept by decision on #1209.
    name: 'Cozy Coven wears one identity (#1209)',
    retired:
      /--faction-coven-(win-|title-|body-bg|notepad-|scrap-|sticker-|stamp-|tape|dot|ivy)|--gestalt-/,
    // `--gestalt-*` were the whimsy.exe aliases the faction-select tile reached
    // for. Coven-only: `FactionSelectCard`'s COVEN branch was the readership.
    live: /--faction-coven-(slip|ward)-|factionMarks\/covenSlip/,
  },
  {
    // #1208 — THE VALLEY PLATE (Poiret One / Cinzel / Spectral, the kit in
    // `components/factionMarks/ephemeristsPlate.tsx`) is the live language,
    // shipped by the v2 task card (#1023), task detail (#1032), praxis detail
    // (#1120) and the praxis card / score stamp / vote / seal (#1207). THE CODEX
    // — the `--eph-*` illuminated-manuscript family — painted everything else.
    //
    // #1661 thinned those declarations without touching this guard, and #2698
    // stage 1 thinned them again — five colours whose only reader in the repo
    // was a `factionContrast.test.ts` row went with the rows. What is left is
    // `--eph-display` / `--eph-serif`, still aliased by the
    // `--faction-ephemerists-card-font` / `-body-font` half of the §3 contract,
    // and THREE colours that are dead as PAINT and alive as MEASUREMENTS: two
    // `ephemerists vellum, …` rows measure `--eph-muted` and `--eph-rubric` on
    // `--eph-vellum`, and the rubric pairing still holds a #651 baseline entry.
    // Retiring those two rows is what would retire the last three.
    name: 'the Ephemerists wear one identity (#1208)',
    retired: /--eph-/,
    live: /--faction-ephemerists-plate-|factionMarks\/ephemeristsPlate/,
  },
  {
    // #1708 — tape was SPECIFIED, not accidental: `tape` is a first-class token
    // in both SNIDE palettes in the design kit, and epic #1179's seam table names
    // it ("ground() — SNIDE grain + tape"). The owner overrode that seam on
    // 2026-08-14. This row is the record, so a later fidelity pass against the
    // design does not quietly put the strips back.
    //
    // One name covers all three forms, because each contains it: the
    // `--faction-snide-tape` token, its always-dark twin `--snide-tape`, and the
    // `.snide-tape` class the strips wore.
    //
    // NOT covered, deliberately — a different visual family, and they stay:
    // `SnideTaskDetail`'s HAZARD tape (diagonal stripes on the action plate) and
    // `SnidePraxisDetail`'s clippings "taped along the rail". Neither reaches for
    // the retired name, so neither has to be excused here.
    name: 'S.N.I.D.E. wears no tape (#1708)',
    retired: /snide-tape/,
    // No `live`: nothing replaced the strips. index.css carries three comment
    // tombstones where the two tokens and the `.snide-tape` rule stood, which is
    // why this row scans CSS as well — the retired thing had a RULE, not just a
    // reader, and a revert would put the declaration back before any component
    // reached for it.
    scan: { match: /\.(tsx?|css)$/ },
  },
]

describe.each(RETIREMENTS)('$name', ({ retired, live, scan }) => {
  const files = sourceFiles(scan)

  it('nothing declares, draws or reaches for the retired family', () => {
    expect(files.filter((path) => retired.test(readStripped(path))).map(toRelative)).toEqual([])
  })

  it.runIf(live)('the language the sweep moved TO is still read, so the kit is not orphaned', () => {
    expect(files.filter((path) => live!.test(readStripped(path)))).not.toEqual([])
  })
})

describe('the sweep sees the codebase', () => {
  it('scans a non-empty set, so no row can pass by finding nothing', () => {
    // One assertion for the whole table — this was copied into all three files,
    // and into six other source-scanning guards besides.
    expect(sourceFiles().length).toBeGreaterThan(100)
  })
})
