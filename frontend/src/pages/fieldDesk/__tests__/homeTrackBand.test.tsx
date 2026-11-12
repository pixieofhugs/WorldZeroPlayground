/**
 * The home track measures the current level's band (#2127). Real
 * `useLevelTrack` over a stubbed curve. Level 3 spans 170 → 330, character at
 * 185: the bar is 15/160 (9.375%), not 185/330 (56%).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CurrentUser, CharacterOut } from '../../../api/auth'

/** A curve shaped like the era's, owned by the test — never era values. */
const THRESHOLDS = [0, 20, 70, 170, 330, 550]

const mocks = vi.hoisted(() => ({ user: null as CurrentUser | null }))

vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'mobile' }))
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, refetch: async () => {} }),
}))
vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => ({ level_thresholds: THRESHOLDS }),
}))
vi.mock('../../../hooks/useSidebarPanels', () => ({
  useSidebarPanels: () => ({
    pending_requests_count: 0,
    global_activity: [],
    active_praxes: [],
    loading: false,
    refetch: () => {},
  }),
}))
vi.mock('../../../api/me', () => ({
  getMyCharacters: async () => [],
  setActiveCharacter: async () => {},
}))

// Imported after the mocks are registered.
import FieldDesk from '../../FieldDesk'
import { surfaceMap } from '../../../factions'

function currentUser(faction_slug: string): CurrentUser {
  const character: CharacterOut = {
    id: 42,
    username: 'molly',
    display_name: 'Mollusk',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 3,
    score: 185,
    all_time_score: 185,
    faction_slug,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
  }
  return {
    account_id: 1,
    email: 'wz_pilgrim@example.com',
    provider: 'google',
    character,
    is_admin: false,
    is_owner: false,
    can_create_additional_character: false,
    can_start_as_albescent: false,
    albescent_revealed: false,
    albescent_glimpsed: false,
    can_propose_task: true,
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

function render(faction_slug: string): string {
  mocks.user = currentUser(faction_slug)
  return renderToStaticMarkup(
    <MemoryRouter>
      <FieldDesk />
    </MemoryRouter>,
  )
}

// Every registered skin, derived from the manifest (incl. Albescent, #2815).
const SKINS = Object.keys(surfaceMap('mobileFieldDesk'))

describe('the home level track', () => {
  it('covers every skin the app can dispatch mobileFieldDesk to', () => {
    expect(SKINS).toHaveLength(9)
  })

  it.each(SKINS)('fills against the current band on the %s home', (slug) => {
    const html = render(slug)
    expect(html).toContain('width:9.375%')
    // Decimals: a bare `width:56` matches unrelated `width:56px`.
    expect(html).not.toContain('width:56.06')
  })

  it('names the band it draws, not the whole climb, to a screen reader', () => {
    const html = render('na')
    expect(html).toContain('aria-valuenow="9"')
    expect(html).toContain('15 of 160 points toward Level 4')
  })

  it('still says how far the next level is — the caption keeps the climb', () => {
    const text = render('na').replace(/<[^>]*>/g, ' ')
    expect(text).toContain('145 to Level 4')
    expect(text).toContain('185 all-time')
  })
})
