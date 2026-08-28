/**
 * The burned notice on the faction detail page (#1305).
 *
 * Walks every desktop faction-body archetype plus the Default fallback (which
 * is what Albescent still renders — the surface the defect was reported on;
 * WOW rendered it too until it got a body of its own) and pins the two
 * non-actionable states apart:
 *
 *   - "gate"   → not invited YET (#454). "Keep doing tasks" is true here.
 *   - "burned" → left this faction this era; `can_join_faction` refuses the
 *                join for the rest of it. "Keep doing tasks" is a lie here.
 *
 * UA used to be carved out of this, on the since-reversed reading that
 * graduation-gating resolved it to "none" before any status was consulted. The
 * carve-out was written as a tripwire — "asserted at the render seam anyway so
 * a future refactor of the mapping cannot quietly light it up" — and #2660 is
 * that refactor. UA is an ordinary invite-joinable faction (ADR-0030), so it
 * burns like every other faction and is no longer special-cased here.
 *
 * #2827 ADDS THE OTHER HALF OF THE SAME SENTENCE. The block above pins WHICH
 * line the gate draws; nothing pinned that the line finishes rendering.
 * Singularity's call site dropped `mobile.gateHint`'s interpolation object, so
 * its gate panel printed the literal `{{faction}}` to the reader — a `t()` with
 * a missing value does not throw, it returns a perfectly valid string with the
 * placeholder still in it. Both assertions have to be here, at the RENDER seam:
 * `catalog.test.ts` already checks the leaf and passed the whole time.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so faction copy keys resolve to English text.
import '../../../i18n'
import i18n from '../../../i18n'
import { factionName } from '../../../utils/factions'
import { surfaceMap } from '../../../factions'
import DefaultFactionBody from '../archetypes/DefaultFactionBody'
import type { FactionDetailState, MembershipState } from '../useFactionDetail'

/** A tail of `detail.burned.body` with no apostrophe — SSR escapes those. */
const ERA_NOTICE = 'until the next one begins'

function text(node: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>).replace(
    /<[^>]*>/g,
    '',
  )
}

function stateWith(slug: string, state: MembershipState): FactionDetailState {
  return {
    slug,
    loading: false,
    faction: { slug , status: 'visible' },
    fetchError: null,
    members: [],
    tasks: [],
    recentPraxis: [],
    viewerFactionSlug: null,
    gameFactions: [],
    onSignup: undefined,
    signupMsg: null,
    membership: {
      state,
      currentFactionSlug: null,
      join: async () => {},
      joining: false,
      joinError: null,
    },
  }
}

// Every registered body, plus the Default under `albescent` — the one faction
// still falling through to it, and so the surface this defect was filed
// against. `wow` USED to be pinned here too, overriding the surface map with
// `DefaultFactionBody`; it now has a body of its own, and leaving the override
// in would have quietly kept testing the Default under WOW's name — green, and
// proving nothing about the page WOW actually renders.
const bodies = { ...surfaceMap('factionBody'), albescent: DefaultFactionBody }

describe('burned viewers are told the era is closed, not to keep tasking', () => {
  for (const [slug, Body] of Object.entries(bodies)) {
    it(`${slug} keeps the burn and the soft gate distinguishable`, () => {
      const gate = text(<Body state={stateWith(slug, 'gate')} />)
      const burned = text(<Body state={stateWith(slug, 'burned')} />)

      expect(gate, 'the soft gate keeps its own faction-voiced copy').not.toContain(
        ERA_NOTICE,
      )

      expect(burned, 'the era notice replaces the gate').toContain(ERA_NOTICE)
    })
  }
})

describe('the soft gate names the faction it is gating (#2827)', () => {
  for (const [slug, Body] of Object.entries(bodies)) {
    it(`${slug} finishes rendering its gate line`, () => {
      const gate = text(<Body state={stateWith(slug, 'gate')} />)

      // The POSITIVE case first: the whole interpolated sentence, built the way
      // the call site is supposed to build it. A bare "has no {{" would pass on
      // a page that stopped drawing the line at all.
      expect(gate, 'the gate hint reads with the faction substituted in').toContain(
        i18n.t('factions:mobile.gateHint', { faction: factionName(slug) }),
      )

      // …and the class of defect it belongs to. Every state of this page, not
      // just the one leaf above: an unfilled placeholder is never copy.
      for (const state of ['eligible', 'gate', 'member', 'burned'] as MembershipState[]) {
        expect(
          text(<Body state={stateWith(slug, state)} />),
          `${slug} renders no raw placeholder in the ${state} state`,
        ).not.toContain('{{')
      }
    })
  }
})
