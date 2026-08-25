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
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so faction copy keys resolve to English text.
import '../../../i18n'
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
