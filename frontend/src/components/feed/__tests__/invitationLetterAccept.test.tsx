/**
 * The letter's three Accepts (#1424): `acceptMode` and the markup it drives,
 * asserted as a pair. No DOM, so the confirm step's contents are out of reach;
 * that the button is armed `confirm-first` is the load-bearing claim
 * (defecting closes the old faction for the era).
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
// Shared with the letter itself (#2620).
const NOT_NOW = i18n.t('factions:invitation.dismiss')

describe('acceptMode — the predicate', () => {
  it('suppresses Accept when the letter names the faction you are already in', () => {
    // Reachable after #1425; see `acceptMode`.
    expect(acceptMode(LETTER_SLUG, LETTER_SLUG)).toBe('suppressed')
  })

  it('is one click from unaffiliated — a first join destroys nothing', () => {
    expect(acceptMode('na', LETTER_SLUG)).toBe('one-click')
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
    expect(html).not.toContain('data-invitation-confirm')
  })

  it('draws no Accept at all on an own-faction letter — hidden, never disabled', () => {
    const html = render(LETTER_SLUG)
    expect(html).not.toContain('data-invitation-accept')
    expect(html).not.toContain(`>${ACCEPT}<`)
  })

  it('still offers View Factions in the suppressed case', () => {
    // The fallback is what makes suppressing safe.
    expect(render(LETTER_SLUG)).toContain(VIEW_FACTIONS)
    expect(render('na')).toContain(VIEW_FACTIONS)
    expect(render('coven')).toContain(VIEW_FACTIONS)
  })

  it('draws Not now only when the slot hands down an archive write', () => {
    // Withheld in the Archived tab, where the action is restore.
    expect(render('coven', () => {})).toContain(NOT_NOW)
    expect(render('coven')).not.toContain(NOT_NOW)
    // Survives suppression: a deferral, never an answer (ADR-0070).
    expect(render(LETTER_SLUG, () => {})).toContain(NOT_NOW)
  })

  it('says "Not now", never "Decline" — the letter stays valid', () => {
    expect(NOT_NOW).not.toMatch(/decline/i)
    expect(render('na', () => {})).not.toMatch(/decline/i)
  })
})
