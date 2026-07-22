/**
 * MobileStarVote wiring (#499) — the touch-tuned star caster is a presentational
 * shell over the shared useVote hook (castVote/refetch), so it records exactly
 * like every faction vote UI. SSR (renderToStaticMarkup, no DOM) can't fire a
 * click, so this asserts the wiring structurally:
 *   - a logged-in viewer gets the five interactive rate buttons (the caster),
 *   - an anonymous viewer gets the shared login gate instead.
 * useAuth + castVote are mocked so the control runs over controlled inputs.
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

import { MobileStarVote } from '../mobileArchetypes/shared'

function currentUser(): CurrentUser {
  return {
    account_id: 1,
    character: {
      id: 9,
      username: 'ada',
      display_name: 'Ada',
      bio: null,
      avatar_url: null,
      location: null,
      level: 4,
      score: 100,
      all_time_score: 100,
      faction_slug: 'wow',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
    },
    is_admin: false,
    can_create_additional_character: false,
    can_start_as_albescent: false,
    albescent_revealed: false,
    can_propose_task: false,
    can_propose_metatask: false,
    can_see_retired_tasks: false,
    can_see_pending_tasks: false,
    can_comment: true,
    second_character_level_required: 5,
    era_name: 'Era 3',
    level_jump_reach: 0,
    level_jump_available: false,
  }
}

function render(): string {
  return renderToStaticMarkup(<MobileStarVote praxisId={55} points={16} totalVotes={4} />)
}

describe('MobileStarVote', () => {
  it('renders the five interactive rate buttons for a logged-in viewer', () => {
    mocks.user = currentUser()
    const html = render()
    expect((html.match(/aria-label="Rate \d of 5"/g) ?? []).length).toBe(5)
    expect(html).toContain('<button')
  })

  it('renders the shared login gate for an anonymous viewer', () => {
    mocks.user = null
    const html = render()
    expect(html.replace(/<[^>]*>/g, '')).toContain('Log in to vote')
    expect(html).not.toContain('aria-label="Rate 1 of 5"')
  })
})
