/**
 * THE THREE ACCEPTS OF THE INVITATION LETTER (#1424).
 *
 * The seam under test is the pure predicate `acceptMode(currentSlug,
 * letterSlug)` **and the render decision that follows from it** — asserted as
 * one pair, because a correct predicate wired to nothing would still pass.
 *
 * The harness is `renderToStaticMarkup`: no DOM, so no effect runs and no click
 * fires. What it can prove is exactly what matters here — WHICH CONTROL EXISTS
 * for a given (current faction, letter faction) pair, and that the branch the
 * markup chose is the branch the predicate names. The confirm step's *contents*
 * are one click away and therefore unreachable; that its button is armed to
 * `confirm-first` rather than joining outright is the claim that stands in for
 * it, and it is the load-bearing half: `defect_to_faction` closes the faction
 * you left for the rest of the era.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import { AuthContext } from '../../../auth/AuthContext'
import FeedCardInvitationLetter, { acceptMode } from '../FeedCardInvitationLetter'
import type { ActivityFeedItem } from '../../../api/activityFeed'
import type { CurrentUser } from '../../../api/auth'

const LETTER_SLUG = 'snide'

const letter: ActivityFeedItem = {
  type: 'invitation_letter',
  item_key: 'invitation_letter:1',
  timestamp: '2026-01-01T00:00:00Z',
  actor_display_name: 'Ada',
  actor_faction_slug: null,
  actor_avatar_url: null,
  payload: { faction_slug: LETTER_SLUG },
  context_faction_slug: LETTER_SLUG,
}

/** Only the one field this card reads; the rest of /auth/me is irrelevant here. */
function viewer(factionSlug: string | null): CurrentUser {
  return { character: { faction_slug: factionSlug } } as unknown as CurrentUser
}

function render(factionSlug: string | null, onNotNow?: () => void): string {
  return renderToStaticMarkup(
    <AuthContext.Provider value={{ user: viewer(factionSlug), loading: false, refetch: async () => {}, applyUser: () => {}, signOut: async () => {} }}>
      <MemoryRouter>
        <FeedCardInvitationLetter item={letter} onNotNow={onNotNow} />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

const VIEW_FACTIONS = i18n.t('feed:invitationLetter.viewFactions')
const ACCEPT = i18n.t('common:actions.accept')
const NOT_NOW = i18n.t('feed:invitationLetter.notNow')

describe('acceptMode — the predicate', () => {
  it('suppresses Accept when the letter names the faction you are already in', () => {
    // Still reachable after #1425 stopped delivering these: a letter earned for
    // X while in Y survives joining X, and that consumed row is what ADR-0019
    // gates sibling-character creation with. POST /factions/choose answers it
    // 422 "Already a member of this faction."
    expect(acceptMode(LETTER_SLUG, LETTER_SLUG)).toBe('suppressed')
  })

  it('is one click from unaffiliated — a first join destroys nothing', () => {
    expect(acceptMode('na', LETTER_SLUG)).toBe('one-click')
    // No character faction recorded reads the same way: nothing is left behind.
    expect(acceptMode(null, LETTER_SLUG)).toBe('one-click')
    expect(acceptMode(undefined, LETTER_SLUG)).toBe('one-click')
  })

  it('confirms first from any real faction — accepting is a defection', () => {
    expect(acceptMode('coven', LETTER_SLUG)).toBe('confirm-first')
    expect(acceptMode('wow', LETTER_SLUG)).toBe('confirm-first')
  })
})

describe('the controls the card actually draws', () => {
  it('arms Accept to one click for an unaffiliated viewer', () => {
    const html = render('na')
    expect(html).toContain('data-invitation-accept="one-click"')
    expect(html).toContain(ACCEPT)
  })

  it('arms Accept to the confirm step for an affiliated viewer', () => {
    const html = render('coven')
    expect(html).toContain('data-invitation-accept="confirm-first"')
    // The confirm prose is one click away, so it must NOT be in the first paint.
    expect(html).not.toContain('data-invitation-confirm')
  })

  it('draws no Accept at all on an own-faction letter — hidden, never disabled', () => {
    const html = render(LETTER_SLUG)
    expect(html).not.toContain('data-invitation-accept')
    expect(html).not.toContain(`>${ACCEPT}<`)
  })

  it('still offers View Factions in the suppressed case', () => {
    // The fallback is the whole reason suppressing is safe: the faction page is
    // still the route to everything the letter was for.
    expect(render(LETTER_SLUG)).toContain(VIEW_FACTIONS)
    // ...and it is not a suppressed-only consolation; every state keeps it.
    expect(render('na')).toContain(VIEW_FACTIONS)
    expect(render('coven')).toContain(VIEW_FACTIONS)
  })

  it('draws Not now only when the slot hands down an archive write', () => {
    // The Archived tab withholds it: there the slot's action is *restore*, and a
    // "Not now" that un-archived would mean the opposite of its label.
    expect(render('coven', () => {})).toContain(NOT_NOW)
    expect(render('coven')).not.toContain(NOT_NOW)
    // It survives suppression — archiving a stale card is still meaningful, and
    // "Not now" is a deferral, never an answer (ADR-0070).
    expect(render(LETTER_SLUG, () => {})).toContain(NOT_NOW)
  })

  it('says "Not now", never "Decline" — the letter stays valid', () => {
    expect(NOT_NOW).not.toMatch(/decline/i)
    expect(render('na', () => {})).not.toMatch(/decline/i)
  })
})
