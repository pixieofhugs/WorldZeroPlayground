/**
 * What every praxis-detail kit must do, asserted for every kit (#2814, #2801).
 *
 * THE POPULATION IS THE POINT. Nine of these behaviours were written out by hand
 * across the kit suites — one in six files, one in five, one in four — and the
 * kits that never got a copy were invisible, because nothing enumerated the set
 * a kit could be missing FROM. "Is a kit missing an assertion?" is unanswerable.
 * "Is a kit missing one of INVARIANTS?" is this file.
 *
 * A behaviour belongs here if it cannot vary by faction. Whether a viewer who
 * cannot act is shown an action box is not a kit's decision; neither is hiding a
 * hidden praxis's comments. Everything a kit decides FOR ITSELF — the lotus, the
 * bunting, the censor bar, the plate register — stays in its own suite, and this
 * file must never grow an assertion that names a faction.
 *
 * BOTH LISTS ARE DERIVED, AND THEY COME FROM DIFFERENT PLACES. The kits come
 * from `surfaceMap('praxisDetail')`, so a tenth kit joins by existing. The
 * invariants are hand-authored HERE, which is what keeps this from being a
 * tautology — `defaultManifest.test.tsx` records the same reasoning: a
 * denominator derived from its own subject asserts only that the subject equals
 * itself.
 *
 * EVERY INVARIANT ASSERTS ITS POSITIVE CASE FIRST. A bare `not.toContain` passes
 * the moment the copy it names is deleted, or when the fixture never produced
 * the thing at all — the vacuous-pass failure #2814's audit kept hitting from
 * the other side. So each check below proves the thing appears when it should,
 * then that it does not when it should not.
 *
 * This file is phase 1. It does NOT delete the hand-written copies in the kit
 * suites — that waits on owner QA, per the epic. Adding an invariant here is
 * expected to make some kit fail; that failure is a finding to file, not a
 * reason to narrow the list.
 */
import { describe, expect, it } from 'vitest'
import { surfaceMap } from '../../../factions'
import { aPraxis } from '../../../test/fixtures'
import { VOTERS, renderPraxisDetail } from '../../../test/praxisDetail'
import type { PraxisDetailState } from '../usePraxisDetail'

/** Every registered praxis-detail kit, derived — a tenth joins by existing. */
const KITS: string[] = Object.keys(surfaceMap('praxisDetail'))

type Invariant = {
  /** Reads as the rule, not as the mechanism. */
  readonly name: string
  /** Throws (via expect) when this kit breaks the rule. */
  readonly check: (slug: string) => void
}

const INVARIANTS: readonly Invariant[] = [
  {
    name: 'hides the comment region on a praxis that is not visible',
    check: (slug) => {
      const shown = renderPraxisDetail(slug, { comments: [] })
      expect(shown.text, 'positive case: a visible praxis shows the region').toContain('Discussion')

      const hidden = renderPraxisDetail(slug, {
        comments: [],
        praxis: { ...aPraxis(), moderation_status: 'hidden' },
      } as Partial<PraxisDetailState>)
      expect(hidden.text).not.toContain('Discussion')
    },
  },
  {
    name: "lists who voted and each voter's own rung, never an average",
    check: (slug) => {
      const voted = renderPraxisDetail(slug, { voters: VOTERS })
      expect(voted.text).toContain('Who voted')
      expect(voted.html, 'each voter links to their own character').toContain(
        'href="/characters/11"',
      )

      const unvoted = renderPraxisDetail(slug, { voters: [] })
      expect(unvoted.text, 'no empty voter panel').not.toContain('Who voted')
    },
  },
  {
    name: 'draws no navigation of its own — the breadcrumb is site chrome',
    check: (slug) => {
      const { html } = renderPraxisDetail(slug, {})
      // The trail's CONTENTS are pinned in pages/__tests__/breadcrumbAcrossSurfaces
      // for every skin at both widths. What is left to say here is the negative:
      // no kit re-draws the crumb inside its own sheet, and none grows a phone
      // back bar of its own.
      const sheet = html.slice(html.indexOf('</nav>') + 1)
      expect(sheet, 'no crumb inside the surface').not.toContain('href="/tasks"')
      expect(html, 'no phone back bar').not.toContain('href="/praxis"')
    },
  },
]

/** invariant × kit — the whole grid, named so a failure says which cell. */
const GRID: [string, string, Invariant][] = INVARIANTS.flatMap((inv) =>
  KITS.map((slug): [string, string, Invariant] => [inv.name, slug, inv]),
)

describe('every praxis-detail kit holds every faction-invariant behaviour', () => {
  // The tripwire. A harness that stopped resolving kits would otherwise report a
  // clean grid by asserting nothing at all — the failure that scored one faction
  // at zero assertions during #2814's audit.
  it('has kits and invariants to check at all', () => {
    expect(KITS.length, 'surfaceMap resolved no praxisDetail kits').toBeGreaterThanOrEqual(9)
    expect(INVARIANTS.length).toBeGreaterThan(0)
    expect(GRID).toHaveLength(INVARIANTS.length * KITS.length)
  })

  it.each(GRID)('%s — %s', (_name, slug, invariant) => {
    invariant.check(slug)
  })
})
