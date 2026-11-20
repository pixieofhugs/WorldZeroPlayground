import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import i18n from '../../../i18n'
import DefaultFactionBody from '../archetypes/DefaultFactionBody'
import type { FactionDetailState, MembershipState } from '../useFactionDetail'

function render(state: MembershipState): string {
  const detail: FactionDetailState = {
    slug: 'albescent',
    loading: false,
    faction: { slug: 'albescent', status: 'visible' },
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
  return renderToStaticMarkup(
    <MemoryRouter>
      <DefaultFactionBody state={detail} />
    </MemoryRouter>,
  ).replace(/<[^>]*>/g, '')
}

describe('the Albescent earner at the ceiling (#3710)', () => {
  it('is told New Game+, not to keep tasking', () => {
    const out = render('ng_plus')
    expect(out).toContain(i18n.t('factions:albescent.letter.newGamePlus'))
    expect(out).not.toContain('if you want to be invited')
  })

  it('every other gated viewer still gets the gate hint', () => {
    expect(render('gate')).toContain('if you want to be invited')
    expect(render('gate')).not.toContain(i18n.t('factions:albescent.letter.newGamePlus'))
  })
})
