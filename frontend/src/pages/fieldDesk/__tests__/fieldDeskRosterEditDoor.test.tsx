/**
 * #2552 — the desktop home's player cards carry an edit door.
 *
 * On a phone every character card draws one; all nine `mobileArchetypes/
 * *FieldDesk.tsx` put an `Edit` pill in the identity card's action row. On a
 * laptop the same page drew the same cards and none of them did, so the only
 * non-mobile way to reach `/characters/:id/edit` was the rail's identity card —
 * a door nobody looks for. Owner ruling: edit belongs on the home page's player
 * cards.
 *
 * THE SEAM is one roster card, not the page. `renderToStaticMarkup` never runs
 * effects, so `getMyCharacters` never resolves and `FieldDesk` can only ever be
 * rendered in its "roster still loading" state — there are no cards in that
 * markup to look for a link on. `RosterLifeCard` is exported for exactly this
 * reason, the same way `rosterFooterKey` and `rosterOffersAChoice` are: a page
 * whose cards have no door renders perfectly.
 *
 * Ownership needs no assertion here because it is structural: the roster is
 * `getMyCharacters()`, the account's own lives and nothing else, so every card
 * this component ever draws is one the viewer owns. `fieldDeskRosterGate` pins
 * the page-level half — which viewers see a roster at all.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { CharacterOut } from '../../../api/auth'
import { RosterLifeCard } from '../../FieldDesk'

function life(overrides: Partial<CharacterOut> = {}): CharacterOut {
  return {
    id: 42,
    username: 'molly',
    display_name: 'Mollusk',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 2,
    score: 120,
    all_time_score: 120,
    faction_slug: 'na',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

function render(overrides: Partial<CharacterOut> = {}): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <RosterLifeCard life={life(overrides)} rotation={0} switching={false} onEnter={() => {}} />
    </MemoryRouter>,
  )
}

/** Every `/characters/:id/edit` href in the markup, in document order. */
function editHrefs(html: string): string[] {
  return [...html.matchAll(/href="(\/characters\/\d+\/edit)"/g)].map((m) => m[1])
}

describe('a desktop roster card leads to its own edit page (#2552)', () => {
  it('draws exactly one edit link, pointing at that life', () => {
    expect(editHrefs(render())).toEqual(['/characters/42/edit'])
    expect(editHrefs(render({ id: 7 }))).toEqual(['/characters/7/edit'])
  })

  it('wears the string the rail and all nine phone desks already wear', () => {
    // No new copy for a door that exists nine times over (ADR-0032). If this
    // key ever moves, the phone desks break with it — which is the point.
    expect(i18n.t('common:sidebar.characterCard.edit'), 'guard: key resolves').toBe('Edit')
    expect(render()).toContain(i18n.t('common:sidebar.characterCard.edit'))
  })

  it('navigates with a link, not a button', () => {
    // The phone desks use `<Link>`; so does the rail. It also has to be a
    // SIBLING of the card's button — the card is itself a button, and an
    // anchor nested in one is invalid DOM that a browser will re-parent.
    const html = render()
    expect(html).toMatch(/<a\b[^>]*href="\/characters\/42\/edit"/)
    expect(html).not.toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*<a\b/)
  })

  it('still steps into the life when the card itself is pressed', () => {
    // A deletion-shaped assertion on its own would pass on a card that lost
    // its whole body, so the card's own affordance is pinned beside the door.
    const html = render()
    expect(html).toContain('class="fielddesk-life"')
    expect(html).toContain(i18n.t('common:fieldDesk.stepInto', { name: 'Mollusk' }))
  })
})
