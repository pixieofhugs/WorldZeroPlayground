/**
 * Faction-invariant behaviours, asserted for every praxis-detail kit (#2814).
 * Kits come from `surfaceMap('praxisDetail')`; invariants are hand-authored so
 * it isn't a tautology. Never add an assertion that names a faction.
 *
 * Each invariant asserts its positive case first, so a `not.toContain` cannot
 * pass vacuously. A new invariant failing some kit is a finding, not a reason
 * to narrow the list.
 */
import { describe, expect, it } from 'vitest'
import { surfaceMap } from '../../../factions'
import { aPraxis } from '../../../test/fixtures'
import { VOTERS, renderPraxisDetail } from '../../../test/praxisDetail'
import type { PraxisDetailState } from '../usePraxisDetail'

const KITS: string[] = Object.keys(surfaceMap('praxisDetail'))

type Invariant = {
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
      // Contents are pinned in `breadcrumbAcrossSurfaces`; this is the negative.
      const sheet = html.slice(html.indexOf('</nav>') + 1)
      expect(sheet, 'no crumb inside the surface').not.toContain('href="/tasks"')
      expect(html, 'no phone back bar').not.toContain('href="/praxis"')
    },
  },
]

const GRID: [string, string, Invariant][] = INVARIANTS.flatMap((inv) =>
  KITS.map((slug): [string, string, Invariant] => [inv.name, slug, inv]),
)

describe('every praxis-detail kit holds every faction-invariant behaviour', () => {
  // Tripwire: an empty grid would assert nothing.
  it('has kits and invariants to check at all', () => {
    expect(KITS.length, 'surfaceMap resolved no praxisDetail kits').toBeGreaterThanOrEqual(9)
    expect(INVARIANTS.length).toBeGreaterThan(0)
    expect(GRID).toHaveLength(INVARIANTS.length * KITS.length)
  })

  it.each(GRID)('%s — %s', (_name, slug, invariant) => {
    invariant.check(slug)
  })
})
