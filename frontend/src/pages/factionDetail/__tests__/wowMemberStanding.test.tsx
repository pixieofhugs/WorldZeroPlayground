/**
 * WOW tells a sworn knight what they rank as (#2774).
 *
 * THE SEAM: `WowFactionBody`'s muster panel rendered against the real catalog —
 * both halves at once, because neither half catches this on its own.
 *
 *   - The catalog half: `wow.join.memberStanding` shipped as
 *     `Standing · <1>PLACEHOLDER</1>` and rendered LIVE on
 *     worldzero.org/factions/wow to anonymous visitors. It was the one faction
 *     placeholder a stranger could stumble into.
 *   - The markup half: the value is a `<Trans>` with a child element, and #2660
 *     found how that silently breaks — UA split the separator out as `{" "}`,
 *     which made the whitespace node child 1 and the accent span child 2, so
 *     i18next dropped the span and every UA member read a bare "Standing ·".
 *     A catalog-only assertion is green straight through that.
 *
 * So the assertion is on the whole rendered line, and on the absence of the
 * word the issue was filed about.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so faction copy keys resolve to English text.
import '../../../i18n'
import WowFactionBody from '../archetypes/WowFactionBody'
import type { FactionDetailState } from '../useFactionDetail'

function memberState(): FactionDetailState {
  return {
    slug: 'wow',
    loading: false,
    faction: { slug: 'wow', status: 'visible' },
    fetchError: null,
    members: [],
    tasks: [],
    recentPraxis: [],
    viewerFactionSlug: 'wow',
    gameFactions: [],
    onSignup: undefined,
    signupMsg: null,
    membership: {
      state: 'member',
      currentFactionSlug: 'wow',
      join: async () => {},
      joining: false,
      joinError: null,
    },
  }
}

/** Tags stripped, so a `<b>` around the standing word cannot split the line. */
function text(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <WowFactionBody state={memberState()} />
    </MemoryRouter>,
  ).replace(/<[^>]*>/g, '')
}

describe('the muster names a knight’s standing (#2774)', () => {
  it('reads the whole line, separator and accent word together', () => {
    // The WHOLE line. A bare `toContain('GLORIOUS')` would pass off a dropped
    // `<1>` that left "Standing ·" hanging, which is the exact #2660 failure.
    expect(text()).toContain('Standing · GLORIOUS')
  })

  it('says no PLACEHOLDER anywhere a stranger can read', () => {
    expect(text()).not.toContain('PLACEHOLDER')
  })
})
