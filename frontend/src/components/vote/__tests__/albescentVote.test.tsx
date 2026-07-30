/**
 * AlbescentVote (#843) — the eighth vote widget, and the ONE thing this file
 * exists to stop from silently regressing: Albescent used to fall through to
 * `DefaultVote`, and because the fallback renders a plausible row of dots,
 * nothing looked broken. So the registration is pinned as hard as the geometry.
 *
 * The harness is SSR-only (renderToStaticMarkup, no DOM, effects never run), so
 * everything here is asserted from markup given props:
 *   - the manifest claims the `vote` surface and the dispatcher hands it back,
 *   - the row is ONE windowed rainbow, not five isolated slices,
 *   - each blob holds a distinct polygon at rest (the morph clock is frozen
 *     without effects, which is exactly the reduced-motion state),
 *   - the tier words stay gone (#783): plain numerals, no word ladder.
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
import { pickVariant } from '../../../utils/factionDispatch'
import { resolvedArchetype } from '../../../factions/lazyArchetype'

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
      level: 8,
      score: 100,
      all_time_score: 100,
      faction_slug: 'albescent',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
    },
    is_admin: false,
    can_create_additional_character: false,
    can_start_as_albescent: true,
    albescent_revealed: true,
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
      pickVariant(map as Record<string, typeof AlbescentVote>, 'albescent', DefaultVote),
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
    // SPAN = 22+24+26+28+30 + 4×14 = 186; each blob is pushed left by every
    // blob and gap before it. Per-dot slices would repeat a single offset.
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
    // Five blobs × (clip-path + -webkit-clip-path), all five shapes distinct.
    expect(clips).toHaveLength(10)
    expect(new Set(clips).size).toBe(5)
    // 48 points each — the fixed count is what lets CSS tween 3 lobes into 6.
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

  it('prints plain numerals — Albescent gave up its vote voice (#783)', () => {
    mocks.user = currentUser()
    const html = render(4)
    const text = html.replace(/<[^>]*>/g, '')
    expect(text).toContain('4')
    for (const word of ['Witness', 'Inscribed', 'brilliant', 'great', 'so-so']) {
      expect(text).not.toContain(word)
    }
  })
})
