/**
 * WOW's faction body, the muster page (#951): the enlist rail per membership
 * state (hard to reach by hand), and WOW's own copy rather than `mobile.*` keys.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so faction copy keys resolve to English text.
import '../../../i18n'
import i18n from '../../../i18n'
import WowFactionBody from '../archetypes/WowFactionBody'
import { factionDescription } from '../../../utils/factions'
import type { FactionDetailState, MembershipState } from '../useFactionDetail'

function text(node: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>).replace(/<[^>]*>/g, '')
}

function stateWith(state: MembershipState): FactionDetailState {
  return {
    slug: 'wow',
    loading: false,
    faction: { slug: 'wow' },
    fetchError: null,
    members: [],
    tasks: [],
    recentPraxis: [],
    membership: {
      state,
      currentFactionSlug: null,
      join: async () => {},
      joining: false,
      joinError: null,
    },
  } as unknown as FactionDetailState
}

const render = (state: MembershipState) => text(<WowFactionBody state={stateWith(state)} />)

describe('the enlist rail answers every membership state', () => {
  it('offers the oath to an eligible viewer — the control the Default body lacks', () => {
    expect(render('eligible')).toContain('TAKE THE OATH')
  })

  it('never offers it to anyone who cannot act', () => {
    for (const state of ['none', 'member', 'gate', 'burned'] as const) {
      expect(render(state), `${state} must not see the oath`).not.toContain('TAKE THE OATH')
    }
  })

  it('draws no rail at all for a viewer with no character', () => {
    const heading = i18n.t('factions:wow.join.heading')
    expect(render('eligible'), 'the rail is headed where it is drawn').toContain(heading)
    expect(render('none')).not.toContain(heading)
  })

  it('keeps the gate and the burn distinguishable', () => {
    // #454 / #1305
    expect(render('gate')).toContain('Await thy summons')
    expect(render('burned')).not.toContain('Await thy summons')
    expect(render('burned')).toContain('until the next one begins')
  })
})

describe('the page speaks in WOW voice, not the phone catalog', () => {
  it('wires the about panel, the roll and both galleries', () => {
    // Shared headings since #1911; WOW's own voice is covered in factionDetailResponsive.
    const markup = render('none')
    expect(markup).toContain(i18n.t('factions:detail.aboutHeading'))
    expect(markup).toContain(i18n.t('factions:detail.default.membersHeading', { total: 0 }))
    expect(markup).toContain(i18n.t('factions:detail.default.tasksHeading', { total: 0 }))
    expect(markup).toContain(i18n.t('factions:detail.default.recentHeading'))
  })

  // #1909: the bespoke charter was cut deliberately; the panel prints the
  // catalog description, non-empty, whatever it currently says.
  it('fills the charter panel with the faction description, not a bespoke charter', () => {
    const markup = render('none')
    expect(factionDescription('wow').length).toBeGreaterThan(0)
    expect(markup).toContain(factionDescription('wow'))
    expect(markup).not.toContain('The Charter of Whimsy')
    expect(markup).not.toContain('We knight houseplants')
  })

  it('does not fall back to the phone page copy', () => {
    // `mobile.gateHint` is correct since #1911; only phone headings are a tell.
    const markup = render('gate')
    expect(markup).toContain(i18n.t('factions:mobile.gateHint', { faction: 'Warriors of Whimsy' }))
    expect(markup).not.toContain('Top members')
  })
})

describe('a roll entry keeps its name readable in the rail (#3103)', () => {
  it('gives the name a real flex basis, so the pill and stat wrap instead of it', () => {
    // No layout here; asserts the cause: `flex: 1` (zero basis) never forces a wrap.
    const state = stateWith('none')
    state.members = [
      { id: 1, display_name: 'Marigold', level: 3, all_time_score: 1200 },
    ] as unknown as FactionDetailState['members']
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <WowFactionBody state={state} />
      </MemoryRouter>,
    )
    const name = html.match(/<span[^>]*style="([^"]*)"[^>]*>Marigold<\/span>/)?.[1]
    expect(name).toMatch(/flex:1 1 \d+ch/)
  })
})
