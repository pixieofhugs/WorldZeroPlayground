/**
 * A retired SURFACE stays retired — no shipped file names one, in code or prose.
 *
 * Twelve manifest surfaces have been collapsed away since #1090, and each one
 * left a paragraph behind: what it was, which issue took it, which skins went
 * with it, and why it is not coming back. #2533 measured ninety-six such
 * references across the tree, in files whose CODE never mentions the surface at
 * all. That is a retirement register, maintained by hand, in the docblocks of
 * whichever module happened to be adjacent. #2758 cut it. This stops it growing
 * back: the thirteenth retirement adds a name here instead of a paragraph
 * somewhere else.
 *
 * WHY THIS ONE READS RAW SOURCE, WHERE ITS NEIGHBOURS STRIP COMMENTS
 * -----------------------------------------------------------------
 * Every other guard on `sourceScan` — `retiredIdentities`, the ink rules, the
 * inline-animation sweep — calls `readStripped`, because it is hunting a draw
 * call and the docblock above it legitimately names the thing being banned.
 * This rule is the exact inverse. Not one of the ninety-six references was
 * code; the register IS comments. A comment-stripping scan here would police
 * nothing and pass on the day it was written.
 *
 * WHY IT IS A SIBLING OF `retiredIdentities.test.ts` AND NOT A ROW IN IT
 * ----------------------------------------------------------------------
 * That file's header says "a fourth retirement is a row, not a file", and a
 * retired surface looks like a fourth retirement. It is not: its table runs one
 * `describe.each` over `readStripped`, and the paragraph above is the whole
 * reason this rule exists. Adding a row would mean adding a per-row reader knob
 * to a three-row table so that one row could invert the premise its header
 * states ("Only a draw call counts"). Two files, two premises.
 *
 * SCOPE is `sourceFiles()`'s defaults, unmodified: `frontend/src`, TS/TSX,
 * `__tests__` excluded. That default exists for the documented reason — a guard
 * asks about SHIPPED code — and here it also settles a conflict for free.
 * `duelSealFormFactor.test.tsx` and `profileFormFactor.test.tsx` each hold a
 * live `expect(SURFACE_KEYS).not.toContain(...)`, which is #2533's own
 * prescription ("if a rule must survive its surface, it belongs in an ADR or a
 * test name"). A guard that flagged those would be arguing with the ruling that
 * authorised it. `docs/` is out of scope too: ADRs are supposed to be
 * historical, and `docs/kit-structure.md` teaches a live rule through a
 * retired surface as its example.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

import { SURFACE_KEYS } from '../factions/manifest'
import { sourceFiles, toRelative } from '../test/sourceScan'

/**
 * Names of retired renderings — surface keys that once existed in
 * `SURFACE_KEYS`, and (since #2996) the two form-factor BRANCHES that were
 * retired without ever having been keys.
 *
 * ponytail: a hand-maintained denylist, because the repo keeps no list of
 * retired keys — `SURFACE_KEYS` holds only the live ones, and a key's removal
 * leaves nothing behind to derive this from. The upgrade path is one line: a
 * thirteenth retirement appends its name. If that ever stops being cheap,
 * `manifest.ts` grows a `RETIRED_SURFACE_KEYS` export and this reads it.
 *
 * `mobileFieldDesk` is deliberately absent — it is LIVE in `SURFACE_KEYS`, and
 * a pattern matching `mobile*` broadly would take it out. So would
 * `factionCard`, which #2533's table lists but which was never a surface key.
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
  // #2996's two, and the first entries here that are not surface KEYS. The
  // player profile was drawn by three renderers: `ProfileSkin` for seven kits,
  // and a form-factor branch inside each of na's and WOW's archetypes. Those
  // two never reached the manifest — they were `useFormFactor()` dispatches in
  // a file, which is precisely why nothing but a name here can hold them
  // retired. Both branch components were spelt the same, and both marked their
  // root with the same testid, so two entries cover both files.
  //
  // `mobileProfile` above is the SURFACE key retired with #1319's collapse and
  // is a different thing: these are what that collapse left behind inside two
  // archetypes for another nine months.
  'MobileProfile',
  'mobile-profile',
] as const

/** `path:line names \`key\`` for every hit, so a failure points at the line. */
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
    // No "the sweep saw a non-empty tree" assertion here: this walks exactly
    // `sourceFiles()`'s default set, and `retiredIdentities.test.ts` already
    // asserts that set is >100 files for the whole harness.
    expect(sourceFiles().flatMap(namings)).toEqual([])
  })

  it('bans nothing that is still a live surface', () => {
    // Guards the denylist itself: un-retire a key and this fails before the
    // sweep above starts reporting every honest use of it.
    expect(RETIRED_SURFACES.filter((key) => (SURFACE_KEYS as readonly string[]).includes(key))).toEqual([])
  })
})
