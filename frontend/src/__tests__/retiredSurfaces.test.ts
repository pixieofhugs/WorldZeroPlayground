/**
 * A retired SURFACE stays retired — no shipped file names one, in code or prose.
 *
 * Stops retirement paragraphs regrowing in docblocks (#2758): a new retirement
 * adds a name here instead. Reads RAW source — the register was comments, so
 * unlike `retiredIdentities.test.ts` (draw calls only) nothing is stripped.
 * Tests and `docs/` are out of scope: a test may assert a key's absence (#2533).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

import { SURFACE_KEYS } from '../factions/manifest'
import { sourceFiles, toRelative } from '../test/sourceScan'

/**
 * Retired surface keys, plus two form-factor branches that were never keys (#2996).
 *
 * ponytail: hand-maintained denylist (nothing records retired keys); if it
 * stops being cheap, `manifest.ts` exports `RETIRED_SURFACE_KEYS` and this reads it.
 *
 * Exact names, not `mobile*`: `mobileFieldDesk` is live.
 */
const RETIRED_SURFACES = [
  'duelRail',
  'mobileDuelRail',
  'mobileDuelSeal',
  'mobileTaskCard',
  'mobilePraxisCard',
  'mobileEditPraxis',
  'mobileProfile',
  'mobileFactionPage',
  'mobileFactionsDirectory',
  'mobilePlayersDirectory',
  'mobileCreateCharacter',
  'mobileEditCharacter',
  // #2996: the in-archetype profile branch (component name + root testid),
  // distinct from the `mobileProfile` surface key.
  'MobileProfile',
  'mobile-profile',
] as const

const namings = (path: string): string[] =>
  readFileSync(path, 'utf8')
    .split('\n')
    .flatMap((line, index) =>
      RETIRED_SURFACES.filter((key) => line.includes(key)).map(
        (key) => `${toRelative(path)}:${index + 1} names \`${key}\``,
      ),
    )

describe('a retired surface stays retired (#2758)', () => {
  it('no shipped source file names one', () => {
    expect(sourceFiles().flatMap(namings)).toEqual([])
  })

  it('bans nothing that is still a live surface', () => {
    expect(RETIRED_SURFACES.filter((key) => (SURFACE_KEYS as readonly string[]).includes(key))).toEqual([])
  })
})
