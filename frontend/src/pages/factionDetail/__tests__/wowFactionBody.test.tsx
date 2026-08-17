/**
 * WOW's faction-body — the muster page (#951).
 *
 * Two things are worth pinning, and neither is dress.
 *
 * ONE: the enlist rail draws a different thing in every membership state, and
 * only ONE of those five is reachable in a browser without five different
 * accounts. The rail is the whole reason this body exists — `DefaultFactionBody`
 * has no join control at all, so before this skin a WOW player who was invited
 * had nowhere on the page to accept. A regression that hid the button again
 * would look exactly like the bug being fixed.
 *
 * TWO: the copy is WOW's own. The catalog carried `wow.charter`, `wow.roster`,
 * `wow.tasks`, `wow.praxis`, `wow.join` and `wow.spotlight` unread from #900,
 * and the first draft of this component wired the PHONE's `mobile.*` keys
 * instead — which renders identical-looking English on a desktop page while
 * silently making the phone catalog load-bearing for a surface it does not
 * serve. Asserting on the faction-voiced strings is what tells those two apart.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so faction copy keys resolve to English text.
import '../../../i18n'
import i18n from '../../../i18n'
import WowFactionBody from '../archetypes/WowFactionBody'
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
    viewerFactionSlug: null,
    gameFactions: [],
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
    // "Hide unusable controls; don't show them disabled" — a gated or burned
    // viewer must not see a button that would only refuse them.
    for (const state of ['none', 'member', 'gate', 'burned'] as const) {
      expect(render(state), `${state} must not see the oath`).not.toContain('TAKE THE OATH')
    }
  })

  it('draws no rail at all for a viewer with no character', () => {
    expect(render('none')).not.toContain('THE MUSTER')
  })

  it('keeps the gate and the burn distinguishable', () => {
    // "Keep questing" is true for "not invited yet" (#454) and a lie for the
    // burn, which `can_join_faction` refuses for the rest of the era (#1305).
    expect(render('gate')).toContain('Earn thy summons')
    expect(render('burned')).not.toContain('Earn thy summons')
    expect(render('burned')).toContain('until the next one begins')
  })
})

describe('the page speaks in WOW voice, not the phone catalog', () => {
  it('wires the about panel, the roll and both galleries', () => {
    // Four bespoke headings stood here — "The Charter", "The Muster Roll",
    // "Quests Awaiting a Champion", "Chronicles of Proof". #1911 collapsed the
    // about panel, the roster and both gallery headings onto shared strings, so
    // what this can still prove is that all four sections render at all, which
    // is the wiring bug it was written for. WOW's own voice on this page is the
    // muster block, and `factionDetailResponsive.test.tsx` walks that at both
    // widths — it needs a membership state, which this `'none'` render has not.
    const markup = render('none')
    expect(markup).toContain(i18n.t('factions:detail.aboutHeading'))
    expect(markup).toContain(i18n.t('factions:detail.default.membersHeading', { total: 0 }))
    expect(markup).toContain(i18n.t('factions:detail.default.tasksHeading', { total: 0 }))
    expect(markup).toContain(i18n.t('factions:detail.default.recentHeading'))
  })

  /**
   * THE CHARTER OF WHIMSY IS GONE (#1909), and the panel prints the DESCRIPTION.
   *
   * `wow.charter.title` and the three `wow.charter.paragraphs` were all on the
   * copy audit's CUT list: no other faction had body copy on its about panel —
   * the other seven print `factionDescription(slug)` — so once the audit ruled
   * the surface generic, WOW prints it too. That is several hundred words of
   * real writing, deleted deliberately, under the audit's own terms ("we can
   * put it back in intentionally").
   *
   * Guarded as an absence AND a presence: the panel must not be empty (the bug
   * the old `returnObjects` test caught), and the bespoke charter must not creep
   * back onto a settled surface under a new key.
   */
  it('fills the charter panel with the faction description, not a bespoke charter', () => {
    const markup = render('none')
    expect(markup).toContain('We wield the noodle sword')
    expect(markup).not.toContain('The Charter of Whimsy')
    expect(markup).not.toContain('We knight houseplants')
  })

  it('does not fall back to the phone page copy', () => {
    // The gate sentence used to be a tell: `mobile.gateHint` was the retired
    // phone page's, and WOW's own `wow.join.gateBody` said the same thing in
    // the Court's voice. #1911 collapsed that family ONTO `mobile.gateHint`, so
    // the sentence is now the right answer rather than the wrong one and only
    // the phone page's section headings remain a fall-through tell.
    const markup = render('gate')
    expect(markup).toContain(i18n.t('factions:mobile.gateHint', { faction: 'Warriors of Whimsy' }))
    expect(markup).not.toContain('Top members')
  })
})
