/**
 * FieldDesk form-factor dispatch (#500) — the home twin of the TaskDetail
 * mobile-dispatch seam. Renders <FieldDesk /> with useFormFactor mocked and the
 * home hooks stubbed, and pins:
 *   - phone + a carried life → the mobile home skin for that faction
 *     (wow → its bespoke skin; an unregistered faction → the Default skin),
 *   - desktop → the existing roster ("Whose shoes today?"), untouched.
 * The auth + data hooks are mocked so the composing useFieldDeskHome runs for
 * real over controlled inputs (no network, single SSR pass).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CurrentUser, CharacterOut } from '../../../api/auth'

const mocks = vi.hoisted(() => ({
  formFactor: 'desktop' as 'mobile' | 'desktop',
  user: null as CurrentUser | null,
}))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, refetch: async () => {} }),
}))
vi.mock('../../../hooks/useMyActiveTasks', () => ({
  useMyActiveTasks: () => ({ activeTasks: [], loading: false, refetch: () => {} }),
}))
vi.mock('../../../hooks/useMyCharacterStats', () => ({
  useMyCharacterStats: () => ({ votesReceived: 0, loading: false }),
}))
vi.mock('../../../hooks/usePendingRequests', () => ({
  usePendingRequests: () => ({ pendingRequests: [], loading: false, refetch: () => {} }),
}))
vi.mock('../../../api/me', () => ({
  getMyCharacters: async () => [],
  setActiveCharacter: async () => {},
}))

// Imported after the mocks are registered.
import FieldDesk from '../../FieldDesk'

function character(faction_slug: string | null): CharacterOut {
  return {
    id: 42,
    username: 'molly',
    display_name: 'Mollusk',
    bio: null,
    avatar_url: null,
    location: null,
    level: 4,
    score: 340,
    all_time_score: 900,
    faction_slug,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
  }
}

function currentUser(faction_slug: string | null): CurrentUser {
  return {
    account_id: 1,
    character: character(faction_slug),
    is_admin: false,
    can_create_additional_character: false,
    can_start_as_albescent: false,
    albescent_revealed: false,
    can_propose_task: true,
    can_propose_metatask: false,
    can_see_retired_tasks: false,
    can_see_pending_tasks: false,
    can_comment: true,
    second_character_level_required: 5,
    era_name: 'Era 3',
  }
}

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <FieldDesk />
    </MemoryRouter>,
  )
}

describe('FieldDesk form-factor dispatch', () => {
  it('renders the COVEN bespoke home skin on mobile for a COVEN life', () => {
    mocks.formFactor = 'mobile'
    mocks.user = currentUser('coven')
    expect(render()).toContain('data-skin="coven"')
  })

  it('renders the SNIDE bespoke home skin on mobile for a SNIDE life', () => {
    mocks.formFactor = 'mobile'
    mocks.user = currentUser('snide')
    expect(render()).toContain('data-skin="snide"')
  })

  it('falls through to the Default home skin on mobile for an unregistered faction', () => {
    mocks.formFactor = 'mobile'
    mocks.user = currentUser('na')
    const html = render()
    expect(html).toContain('data-skin="default"')
    expect(html).not.toContain('data-skin="coven"')
  })

  it('renders the desktop roster on desktop (skin dispatch untouched)', () => {
    mocks.formFactor = 'desktop'
    mocks.user = currentUser('coven')
    const html = render()
    expect(html).not.toContain('data-skin=')
    expect(html.replace(/<[^>]*>/g, '')).toContain('Whose shoes today?')
  })
})
