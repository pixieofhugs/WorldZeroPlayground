/**
 * WOW's member standing line (#2774), rendered against the real catalog: the
 * `<Trans>` child can be silently dropped (#2660), so the whole line is asserted.
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

function text(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <WowFactionBody state={memberState()} />
    </MemoryRouter>,
  ).replace(/<[^>]*>/g, '')
}

describe('the muster names a knight’s standing (#2774)', () => {
  it('reads the whole line, separator and accent word together', () => {
    expect(text()).toContain('Standing · GLORIOUS')
  })

  it('says no PLACEHOLDER anywhere a stranger can read', () => {
    expect(text()).not.toContain('PLACEHOLDER')
  })
})
