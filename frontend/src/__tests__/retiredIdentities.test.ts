/**
 * Each faction speaks ONE visual identity — the retired-token sweep. A new
 * retirement is a row. Source scan (offenders hide in unrendered branches),
 * comments stripped; it guards NAMES, regardless of declarations.
 */
import { describe, it, expect } from 'vitest'
import { readStripped, sourceFiles, toRelative, type ScanOptions } from '../test/sourceScan'

interface Retirement {
  /** Faction, and the issue that retired the language. */
  readonly name: string
  /** Every form of the dead family, as one pattern. */
  readonly retired: RegExp
  /**
   * What the sweep moved TO; must have at least one reader, so deleting the
   * live kit can't pass. Not a count. Absent when nothing replaced it.
   */
  readonly live?: RegExp
  readonly scan?: ScanOptions
}

const RETIREMENTS: readonly Retirement[] = [
  {
    // Live: the spell slip / ward. Retired: the `coven.exe` window and sticker.
    // Kept: `-card-*`, `-light`/`-border` (§3 contract), `-moon-*`/`-vote-*` (#1209).
    name: 'Cozy Coven wears one identity (#1209)',
    retired:
      /--faction-coven-(win-|title-|body-bg|notepad-|scrap-|sticker-|stamp-|tape|dot|ivy)|--gestalt-/,
    live: /--faction-coven-(slip|ward)-|factionMarks\/covenSlip/,
  },
  {
    // Live: the valley plate (`factionMarks/ephemeristsPlate.tsx`). Retired: the
    // `--eph-*` codex (its surviving font aliases are declared, never read here).
    name: 'the Ephemerists wear one identity (#1208)',
    retired: /--eph-/,
    live: /--faction-ephemerists-plate-|factionMarks\/ephemeristsPlate/,
  },
  {
    // Live: the notation band. Retired: the fluted rule and the glyph register (#2143, #2210).
    name: 'the Ephemerists plate keeps one ornament row (#2210)',
    retired: /\b(?:FlutedRule|GlyphRegister|RuneRule|GlossedGlyph)\b|\b(?:function|const)\s+Glyph\b/,
  },
  {
    name: "Coven's pentagram badge is retired (#2726)",
    retired: /\bSigilMark\b/,
  },
  {
    // The design kit specifies tape; the owner overrode it — this row stops a
    // fidelity pass restoring it. Hazard tape and taped clippings are unrelated.
    name: 'S.N.I.D.E. wears no tape (#1708)',
    retired: /snide-tape/,
    // Scans CSS too: a revert would bring back the rule before any reader.
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
    expect(sourceFiles().length).toBeGreaterThan(100)
  })
})
