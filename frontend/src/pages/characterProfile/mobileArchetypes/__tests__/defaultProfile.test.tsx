/**
 * Mobile public profile (#517) — form-factor dispatch + the Default mobile
 * profile content-slot invariant. The dispatch test renders <CharacterProfile/>
 * with the data + form-factor hooks mocked (phone → the Default mobile skin,
 * desktop → the existing faction-dispatched body). The content test renders the
 * Default mobile skin directly to pin the reused #459 contract fields: identity,
 * the real-fields stats row, badges, friend/foe, and the segmented Praxis/Tasks
 * toggle over the shared PraxisCard/TaskCard.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../../../i18n'
import type { CharacterOut } from '../../../../api/auth'
import type { PraxisCardOut } from '../../../../api/praxis'
import type { TaskOut } from '../../../../api/tasks'
import type { ProfileBodyProps } from '../../FactionProfileBody'

const mocks = vi.hoisted(() => ({
  formFactor: 'desktop' as 'mobile' | 'desktop',
  character: null as CharacterOut | null,
}))

vi.mock('../../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))
vi.mock('../../../../hooks/useResource', () => ({
  useResource: () => ({
    data: [mocks.character, [], []],
    loading: false,
    error: null,
    refetch: () => {},
  }),
}))
vi.mock('../../../../hooks/useGameConfig', () => ({
  useGameConfig: () => ({ level_thresholds: [0, 100, 200, 300, 400] }),
}))
vi.mock('../../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}))

import CharacterProfile from '../../../CharacterProfile'
import DefaultProfile from '../DefaultProfile'

function html(element: ReactElement): { html: string; text: string } {
  const out = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html: out, text: out.replace(/<[^>]*>/g, '') }
}

function character(overrides: Partial<CharacterOut> = {}): CharacterOut {
  return {
    id: 7,
    username: 'reza',
    display_name: 'Reza',
    bio: null,
    avatar_url: null,
    location: null,
    level: 7,
    score: 1880,
    all_time_score: 2400,
    faction_slug: 'ephemerists',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [{ key: 'sock_puppet', name: 'Sock Puppet' }],
    ...overrides,
  }
}

function praxis(overrides: Partial<PraxisCardOut> = {}): PraxisCardOut {
  return {
    id: 101,
    task_id: 5,
    task_title: 'Map a hidden gap',
    task_point_value: 20,
    task_level_required: 2,
    type: 'solo',
    status: 'submitted',
    title: 'A quiet finding',
    moderation_status: 'visible',
    created_by_id: 7,
    created_by_display_name: 'Reza',
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    submitted_at: '2026-01-02T00:00:00Z',
    member_count: 1,
    score: 32,
    voter_count: 3,
    is_top_for_task: false,
    task_faction_slug: 'ephemerists',
    ...overrides,
  }
}

function task(overrides: Partial<TaskOut> = {}): TaskOut {
  return {
    id: 55,
    title: 'Plant a tree',
    description: 'Dig a hole and plant a native sapling.',
    point_value: 20,
    level_required: 2,
    status: 'active',
    task_type: 'standard',
    created_by: 7,
    primary_faction_slug: 'ephemerists',
    metatask_faction_slug: null,
    is_task_vision_eligible: false,
    created_at: '2026-01-01T00:00:00Z',
    can_submit_praxis: true,
    allowed_modes: ['solo'],
    eligible_for_current_user: true,
    ...overrides,
  }
}

function renderPage(): { html: string; text: string } {
  return {
    html: renderToStaticMarkup(
      <MemoryRouter initialEntries={['/characters/7']}>
        <Routes>
          <Route path="/characters/:id" element={<CharacterProfile />} />
        </Routes>
      </MemoryRouter>,
    ),
    text: '',
  }
}

describe('public profile form-factor dispatch', () => {
  it('renders the Default mobile profile skin on mobile', () => {
    mocks.formFactor = 'mobile'
    mocks.character = character({ faction_slug: null })
    expect(renderPage().html).toContain('data-testid="mobile-profile"')
  })

  it('renders the desktop faction-dispatched body on desktop (untouched)', () => {
    mocks.formFactor = 'desktop'
    mocks.character = character({ faction_slug: null })
    const out = renderPage().html
    expect(out).not.toContain('data-testid="mobile-profile"')
    expect(out).toContain('Unaffiliated · faction pending')
  })
})

describe('Default mobile profile content slots', () => {
  const props: ProfileBodyProps = {
    character: character(),
    submissions: [praxis()],
    proposedTasks: [task()],
    progression: null,
    identityActions: <div>Friend</div>,
  }

  it('renders identity, stats, badges and friend/foe from the #459 contract', () => {
    const { text } = html(<DefaultProfile {...props} />)
    expect(text, 'name').toContain('Reza')
    expect(text, 'stats row').toContain('Points')
    expect(text, 'badge').toContain('Sock Puppet')
    expect(text, 'friend/foe control').toContain('Friend')
  })

  it('offers a segmented Praxis/Tasks toggle over the reused cards', () => {
    const { text } = html(<DefaultProfile {...props} />)
    // Praxis is the default segment → the reused PraxisCard renders.
    expect(text, 'praxis card').toContain('Map a hidden gap')
    expect(text, 'tasks tab present').toContain('Tasks')
  })
})
