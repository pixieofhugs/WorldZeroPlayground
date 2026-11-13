/**
 * The burned notice (#1305), across every faction body plus Default:
 *
 *   - "gate"   → not invited YET (#454); "keep doing tasks" is true.
 *   - "burned" → left this era; `can_join_faction` refuses until the next.
 *
 * Also at the RENDER seam: no unfilled `{{faction}}` placeholder (#2827) — a
 * `t()` missing a value returns the raw placeholder, which `catalog.test.ts`
 * can't see.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
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

// Every registered body, plus Default under `albescent` (the one fall-through).
// Don't override a slug that has its own body: it would test the wrong page.
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

      // Positive first: a bare "no {{" check passes if the line vanishes.
      expect(gate, 'the gate hint reads with the faction substituted in').toContain(
        i18n.t('factions:mobile.gateHint', { faction: factionName(slug) }),
      )

      for (const state of ['eligible', 'gate', 'member', 'burned'] as MembershipState[]) {
        expect(
          text(<Body state={stateWith(slug, state)} />),
          `${slug} renders no raw placeholder in the ${state} state`,
        ).not.toContain('{{')
      }
    })
  }
})
