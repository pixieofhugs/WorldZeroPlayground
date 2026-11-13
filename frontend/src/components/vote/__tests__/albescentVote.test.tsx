/**
 * AlbescentVote (#843). The registration is pinned as hard as the geometry: a
 * fall-through to `DefaultVote` renders plausible dots and looks fine.
 * SSR-only, so the frozen morph clock is also the reduced-motion state.
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

import AlbescentVote from '../AlbescentVote'
import DefaultVote from '../DefaultVote'
import { surfaceMap } from '../../../factions'
import { resolveVariant } from '../../../utils/factionDispatch'
import { resolvedArchetype } from '../../../factions/lazyArchetype'

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
      faction_slug: 'albescent',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      badges: [],
      invitations: [],
    },
    is_admin: false,
    is_owner: false,
    can_create_additional_character: false,
    can_start_as_albescent: true,
    albescent_revealed: true,
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

function render(currentValue?: number): string {
  return renderToStaticMarkup(
    <AlbescentVote praxisId={7} currentValue={currentValue} points={16} totalVotes={4} />,
  )
}

describe('albescent claims the vote surface', () => {
  it('registers its own widget instead of falling through to DefaultVote', () => {
    const map = surfaceMap('vote')
    expect(map['albescent']).toBeDefined()
    const Resolved = resolvedArchetype(
      resolveVariant(map as Record<string, typeof AlbescentVote>, 'albescent'),
    )
    expect(Resolved).toBe(AlbescentVote)
    expect(Resolved).not.toBe(DefaultVote)
  })
})

describe('AlbescentVote markup', () => {
  it('renders five rate buttons for a logged-in viewer', () => {
    mocks.user = currentUser()
    const html = render()
    expect((html.match(/aria-label="Rate \d of 5"/g) ?? []).length).toBe(5)
  })

  it('renders the shared login gate for an anonymous viewer', () => {
    mocks.user = null
    const html = render()
    expect(html.replace(/<[^>]*>/g, '')).toContain('Log in to vote')
    expect(html).not.toContain('aria-label="Rate 1 of 5"')
  })

  it('windows ONE rainbow across the row rather than slicing per dot', () => {
    mocks.user = currentUser()
    const html = render(5)
    // SPAN = 22+24+26+28+30 + 4×14 = 186; per-dot slices would repeat one offset.
    for (const size of [22, 24, 26, 28, 30]) {
      expect(html).toContain(`background-size:186px ${size}px`)
    }
    for (const offset of [0, -36, -74, -114, -156]) {
      expect(html).toContain(`background-position-x:${offset}px`)
    }
  })

  it('gives every blob its own lobe count at rest, so a stilled row still reads', () => {
    mocks.user = currentUser()
    const html = render(5)
    const clips = html.match(/clip-path:polygon\([^)]*\)/g) ?? []
    // clip-path + -webkit-clip-path per blob.
    expect(clips).toHaveLength(10)
    expect(new Set(clips).size).toBe(5)
    // A fixed 48 points lets CSS tween 3 lobes into 6.
    expect((clips[0] ?? '').split(',')).toHaveLength(48)
  })

  it('fills reached blobs with the neutral spectrum and nothing faction-coloured', () => {
    mocks.user = currentUser()
    const html = render(3)
    expect(html).toContain('background-image:var(--faction-default-rainbow)')
    expect(html).toContain('var(--spectrum-glow-3)')
    expect(html).not.toContain('--faction-albescent')
  })

  it('gates the bob through the shared reduced-motion CSS class, never inline', () => {
    mocks.user = currentUser()
    const html = render(2)
    expect((html.match(/spectrum-dot--reached/g) ?? []).length).toBe(2)
    expect(html).not.toContain('animation:')
  })

  /**
   * #2166: no words under the stars; Albescent borrows no faction's vocabulary
   * (#783). `render` passes a tally, so the emptiness is a real negative.
   */
  it('prints no words under the blobs at all (#783, #2166)', () => {
    mocks.user = currentUser()
    const html = render(4)
    const text = html.replace(/<[^>]*>/g, '')
    expect(text.trim()).toBe('')
    for (const word of ['Witness', 'Inscribed', 'brilliant', 'great', 'so-so']) {
      expect(text).not.toContain(word)
    }
  })
})
