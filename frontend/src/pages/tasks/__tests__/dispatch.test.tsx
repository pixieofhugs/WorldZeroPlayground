/**
 * Tasks form-factor dispatch — useFormFactor mocked 'mobile' selects the Default
 * mobile browse skin; 'desktop' keeps the existing flex-wrap list. Mirrors the
 * TaskDetail dispatch seam (#494/#496). useTasks is mocked to a canned state so
 * the branch under test renders without hitting the network.
 *
 * The second half covers the ADR-0056 rewire (#1022): mobile browse renders the
 * SHARED <TaskCard>, so both branches must now show the same card and the same
 * signup CTA, gated identically on `can_submit_praxis`. Before the rewire mobile
 * had no CTA at all, so "the button is there on mobile" is the regression this
 * pins.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { CurrentUser } from '../../../api/auth'
import type { TaskOut } from '../../../api/tasks'
import type { TasksState } from '../useTasks'

// Mutable form factor the mocked hook reports; each test sets it before render.
const dispatch: { formFactor: 'mobile' | 'desktop' } = { formFactor: 'desktop' }

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => dispatch.formFactor,
}))

const TASK: TaskOut = {
  id: 7,
  title: 'Photosynthesis',
  description: 'Leave something small and honest where a stranger will find it.',
  point_value: 18,
  level_required: 2,
  status: 'active',
  task_type: 'standard',
  created_by: 3,
  primary_faction_slug: null,
  metatask_faction_slug: null,
  is_task_vision_eligible: false,
  created_at: '2026-01-01T00:00:00Z',
  in_progress_count: 6,
  can_submit_praxis: true,
  allowed_modes: ['solo'],
  eligible_for_current_user: true,
}

const VIEWER: CurrentUser = {
  account_id: 1,
  character: null,
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
  era_name: 'Era 1',
  level_jump_reach: 0,
  level_jump_available: false,
}

// Canned task-browse state. Tests that only exercise the dispatch branch leave
// the list empty and hit each branch's own empty state.
const CANNED: TasksState = {
  user: null,
  tasks: [],
  loading: false,
  error: null,
  factions: [{ slug: 'everymen' }],
  factionConfigs: [],
  // Derived from the era ladder at runtime (#1046) — era_1 has nine levels.
  levelFilters: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  statusFilters: ['All', 'active'],
  taskType: 'standard',
  setTaskType: () => {},
  status: 'All',
  setStatus: () => {},
  faction: '',
  setFaction: () => {},
  level: '',
  setLevel: () => {},
  query: '',
  setQuery: () => {},
  hasMore: false,
  loadMore: () => {},
  signupMsg: null,
  handleSignup: async () => {},
  displayPointsFor: () => 0,
  displayMultiplierFor: () => 1,
}

// What the mocked hook hands back; each test replaces it before rendering.
const state: { current: TasksState } = { current: CANNED }

vi.mock('../useTasks', () => ({
  useTasks: () => state.current,
}))

import Tasks from '../../Tasks'

function html(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Tasks />
    </MemoryRouter>,
  )
}

function text(): string {
  return html().replace(/<[^>]*>/g, '')
}

const SIGNUP = i18n.t('feed:taskCard.na.signup')

describe('Tasks form-factor dispatch', () => {
  it('renders the Default mobile browse skin on mobile', () => {
    dispatch.formFactor = 'mobile'
    state.current = CANNED
    expect(html()).toContain('mobile-tasks-browse')
  })

  it('renders the existing desktop list on desktop', () => {
    dispatch.formFactor = 'desktop'
    state.current = CANNED
    const out = html()
    expect(out, 'no mobile skin').not.toContain('mobile-tasks-browse')
    // The desktop rubber-stamp status filter (FilterStamps) is desktop-only chrome.
    expect(out.toLowerCase(), 'desktop status filter').toContain('status:')
  })
})

describe('task-browse card + CTA parity (ADR-0056)', () => {
  it('renders the shared card at its mobile size on mobile', () => {
    dispatch.formFactor = 'mobile'
    state.current = { ...CANNED, user: VIEWER, tasks: [TASK] }
    const out = html()
    expect(out, 'shared TaskCard, sized for the phone').toContain(
      'data-form-factor="mobile"',
    )
    expect(out, 'task link').toContain('href="/tasks/7"')
    expect(out.replace(/<[^>]*>/g, ''), 'title').toContain('Photosynthesis')
  })

  it('shows the inline signup CTA on BOTH form factors when the viewer may sign up', () => {
    for (const formFactor of ['mobile', 'desktop'] as const) {
      dispatch.formFactor = formFactor
      state.current = { ...CANNED, user: VIEWER, tasks: [TASK] }
      expect(text(), formFactor).toContain(SIGNUP)
    }
  })

  it('hides the CTA on both when the task refuses the viewer a praxis', () => {
    const barred: TaskOut = { ...TASK, can_submit_praxis: false }
    for (const formFactor of ['mobile', 'desktop'] as const) {
      dispatch.formFactor = formFactor
      state.current = { ...CANNED, user: VIEWER, tasks: [barred] }
      expect(text(), formFactor).not.toContain(SIGNUP)
    }
  })

  it('hides the CTA on both for a logged-out viewer', () => {
    for (const formFactor of ['mobile', 'desktop'] as const) {
      dispatch.formFactor = formFactor
      state.current = { ...CANNED, user: null, tasks: [TASK] }
      expect(text(), formFactor).not.toContain(SIGNUP)
    }
  })

  it('surfaces the signup outcome message on mobile, where the CTA now lives', () => {
    dispatch.formFactor = 'mobile'
    state.current = {
      ...CANNED,
      user: VIEWER,
      tasks: [TASK],
      signupMsg: { id: 7, msg: 'Could not sign up.', ok: false },
    }
    expect(text()).toContain('Could not sign up.')
  })
})
