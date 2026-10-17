/**
 * VoteUI dispatcher — the single ineligibility guard (#998).
 *
 * The whole vote module must render NOTHING for a logged-in viewer the backend
 * says can never vote here (`viewer_can_vote === false`: account ownership or
 * duel participation — the two PERMANENT blocks). Anonymous viewers fall through
 * to each widget's own login gate regardless, and an eligible / unknown viewer
 * gets the ordinary widget.
 *
 * SSR-only harness (renderToStaticMarkup, no DOM, effects never run), so
 * everything is asserted from the produced markup given props + a mocked
 * `useAuth`. `na`/absent faction slug dispatches to the spectrum-sweep
 * DefaultVote, whose logged-in markup is a row of five "Rate N — …"
 * buttons and whose anonymous markup is the shared "Log in to vote" gate.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CurrentUser } from '../../../api/auth'

const mocks = vi.hoisted(() => ({
  user: null as CurrentUser | null,
  castVote: vi.fn(async () => ({}) as unknown),
}))

vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, refetch: async () => {} }),
}))
vi.mock('../../../api/votes', () => ({
  castVote: mocks.castVote,
}))

import VoteUI from '../VoteUI'

function currentUser(): CurrentUser {
  return {
    account_id: 1,
    email: 'wz_pilgrim@example.com',
    provider: 'google',
    character: {
      id: 9,
      username: 'ada',
      display_name: 'Ada',
      bio: '',
      tagline: '',
      avatar_url: '',
      location: '',
      level: 8,
      score: 100,
      all_time_score: 100,
      faction_slug: 'na',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      badges: [],
      invitations: [],
    },
    is_admin: false,
    is_owner: false,
    can_create_additional_character: false,
    can_start_as_albescent: false,
    albescent_revealed: false,
    albescent_glimpsed: false,
    can_propose_task: false,
    can_propose_metatask: false,
    can_apply_metatask: false,
    can_see_retired_tasks: false,
    can_see_pending_tasks: false,
    can_comment: true,
    can_vote: true,
    vote_level_required: 1,
    albescent_level_required: 8,
    second_character_level_required: 5,
    era_name: 'Era 3',
    level_jump_reach: 0,
    level_jump_available: false,
    task_browse_defaults_to_eligible: false,
  }
}

function render(viewerCanVote?: boolean, factionSlug: string | null = null): string {
  return renderToStaticMarkup(
    <VoteUI factionSlug={factionSlug} praxisId={7} viewerCanVote={viewerCanVote} />,
  )
}

// DefaultVote's five rate buttons: aria-label "Rate {n} — {tier}" (#855).
const RATE_BUTTON = /aria-label="Rate \d/
const rateButtonCount = (html: string): number =>
  (html.match(/aria-label="Rate \d/g) ?? []).length

describe('VoteUI ineligibility guard (#998)', () => {
  it('renders nothing for a logged-in viewer who cannot vote (viewer_can_vote false)', () => {
    mocks.user = currentUser()
    expect(render(false)).toBe('')
  })

  it('renders the widget for a logged-in viewer who can vote', () => {
    mocks.user = currentUser()
    expect(rateButtonCount(render(true))).toBe(5)
  })

  it('renders the widget when eligibility is unknown (undefined defaults to showing)', () => {
    mocks.user = currentUser()
    expect(rateButtonCount(render(undefined))).toBe(5)
  })

  it('shows the login gate for an anonymous viewer even when viewer_can_vote is false', () => {
    mocks.user = null
    const html = render(false)
    expect(html.replace(/<[^>]*>/g, '')).toContain('Log in to vote')
    expect(html).not.toMatch(RATE_BUTTON)
  })
})

/**
 * The level gate (#3102). A logged-in viewer whose character has never reached
 * the era's vote level gets the logged-out treatment — the one gate line, no
 * 1-5 control — worded with the level the server sent. It is decided here, in
 * the dispatcher, BEFORE a faction widget is chosen, so all nine skins and
 * every surface that mounts `VoteUI` (cards, praxis detail, the duel reader)
 * inherit it without a branch of their own.
 */
describe('VoteUI level gate (#3102)', () => {
  function gatedUser(): CurrentUser {
    return { ...currentUser(), can_vote: false, vote_level_required: 3 }
  }
  const text = (html: string): string => html.replace(/<[^>]*>/g, '')

  it.each([null, 'snide', 'ephemerists'])(
    'shows the level gate and no stars to a gated viewer (faction %s)',
    (slug) => {
      mocks.user = gatedUser()
      const html = render(true, slug)
      expect(text(html)).toContain('Reach level 3 to vote')
      expect(text(html)).not.toContain('Log in to vote')
      expect(html).not.toMatch(/<button/)
    },
  )

  it('still renders nothing on a praxis the gated viewer can never vote on', () => {
    mocks.user = gatedUser()
    expect(render(false)).toBe('')
  })

  it('leaves an account with no active character the stars it had before the gate', () => {
    // `can_vote` is false for it (no character has reached anything), but
    // "Reach level N" is advice it cannot act on. It keeps what it saw before
    // #3102: the widget, with the server's no-character refusal behind it.
    mocks.user = { ...gatedUser(), character: null }
    const html = render(true)
    expect(rateButtonCount(html)).toBe(5)
    expect(text(html)).not.toContain('Reach level')
  })

  it('leaves the logged-out gate worded as it was', () => {
    mocks.user = null
    expect(text(render(true))).toContain('Log in to vote')
    expect(text(render(true))).not.toContain('Reach level')
  })

  it('leaves an eligible viewer with the ordinary widget', () => {
    mocks.user = currentUser()
    const html = render(true)
    expect(rateButtonCount(html)).toBe(5)
    expect(text(html)).not.toContain('Reach level')
  })
})
