/**
 * Tasks form-factor dispatch (#494) with useTasks canned; plus card + CTA parity
 * across both branches (ADR-0056).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { CurrentUser } from '../../../api/auth'
import type { TaskOut } from '../../../api/tasks'
import type { TasksState } from '../useTasks'

const dispatch: { formFactor: 'mobile' | 'desktop' } = { formFactor: 'desktop' }

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => dispatch.formFactor,
}))

const TASK = aTask({
  description: 'Leave something small and honest where a stranger will find it.',
  created_by: 3,
  created_by_display_name: '',
  in_progress_count: 6,
})

const VIEWER: CurrentUser = {
  account_id: 1,
  email: 'wz_pilgrim@example.com',
  provider: 'google',
  // Carries a character: the eligibility rail is gated on one (#1972).
  character: { id: 3, level: 2, faction_slug: 'na' } as never,
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
  era_name: 'Era 1',
  level_jump_reach: 0,
  level_jump_available: false,
  task_browse_defaults_to_eligible: false,
}

const CANNED: TasksState = {
  user: null,
  tasks: [],
  loading: false,
  error: null,
  factions: [{ slug: 'everymen', status: 'visible' }],
  statusFilters: ['All', 'active'],
  taskType: 'standard',
  setTaskType: () => {},
  sort: 'level',
  setSort: () => {},
  status: 'All',
  setStatus: () => {},
  selectedFactions: [],
  setSelectedFactions: () => {},
  canSignUp: false,
  setCanSignUp: () => {},
  query: '',
  setQuery: () => {},
  clearFilters: () => {},
  hasMore: false,
  loadMore: () => {},
  signupMsg: null,
  handleSignup: async () => {},
  displayPointsFor: () => 0,
  displayMultiplierFor: () => 1,
}

const state: { current: TasksState } = { current: CANNED }

// Partial: `TaskFilterBar` reads the real defaults and param helpers.
vi.mock('../useTasks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../useTasks')>()),
  useTasks: () => state.current,
}))

import Tasks from '../../Tasks'
import { aTask } from '../../../test/fixtures'

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

const SIGNUP = i18n.t('feed:taskCard.signup')
const COUNT = i18n.t('tasks:listPage.count', { count: 0 })

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
    // `PageTitle`'s underline, not the word "Tasks": the title is per-letter
    // spans (Style Guide §7), and a bare "Tasks" matches other chrome.
    expect(out, 'desktop page title').toContain(
      'border-bottom:4px solid var(--faction-default-stop-1)',
    )
  })

  it.each(['mobile', 'desktop'] as const)(
    'states the count in the bar, once, on %s (#2262)',
    (formFactor) => {
      dispatch.formFactor = formFactor
      state.current = CANNED
      const out = html()
      expect(out, 'the bar states it').toContain(
        `class="filter-bar__summary">${COUNT}<`,
      )
      expect(
        out.replace(/<[^>]*>/g, '').split(COUNT),
        'exactly one count on screen',
      ).toHaveLength(2)
    },
  )

  it('mounts the shared filter bar on BOTH form factors (#1367)', () => {
    for (const formFactor of ['mobile', 'desktop'] as const) {
      dispatch.formFactor = formFactor
      state.current = CANNED
      const out = html()
      expect(out, formFactor).toContain('filter-bar')
      expect(out, `${formFactor}: search moved into the bar`).toContain(
        'filter-bar__search',
      )
    }
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

  it('hides the CTA on both when the task refuses the viewer without saying why', () => {
    // The shape an uncopied new backend gate arrives in: silence, never a
    // button the server will refuse (#1976).
    const barred: TaskOut = { ...TASK, can_sign_up: false }
    for (const formFactor of ['mobile', 'desktop'] as const) {
      dispatch.formFactor = formFactor
      state.current = { ...CANNED, user: VIEWER, tasks: [barred] }
      expect(text(), formFactor).not.toContain(SIGNUP)
    }
  })

  // #1976: a shown task must say why it cannot be taken.
  it('states the reason on both when the task names why it refuses', () => {
    const barred: TaskOut = {
      ...TASK,
      can_sign_up: false,
      signup_reason: 'below_level',
      level_required: 4,
    }
    for (const formFactor of ['mobile', 'desktop'] as const) {
      dispatch.formFactor = formFactor
      state.current = { ...CANNED, user: VIEWER, tasks: [barred] }
      expect(text(), formFactor).toContain(
        i18n.t('tasks:detail.signup.denied.belowLevel', { level: 4 }),
      )
      expect(text(), `${formFactor}: no longer calls it a sign-up`).not.toContain(SIGNUP)
      expect(html(), `${formFactor}: and it is not pressable`).toContain('aria-disabled="true"')
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
      signupMsg: 'Could not sign up.',
    }
    expect(text()).toContain('Could not sign up.')
  })
})

/**
 * The "tasks I can sign up for" filter (#1130), hidden logged out (the server
 * answers `[]`). Defaults are `taskFilterParams.test.ts`'s; here `canSignUp` is given.
 */
describe('can-sign-up filter (#1130)', () => {
  const CAN_SIGN_UP = i18n.t('tasks:browse.canSignUp')

  it('offers the rail when signed in', () => {
    dispatch.formFactor = 'desktop'
    state.current = { ...CANNED, user: VIEWER }
    expect(text().toLowerCase()).toContain(CAN_SIGN_UP.toLowerCase())
  })

  it('hides the rail on both form factors when logged out', () => {
    for (const formFactor of ['mobile', 'desktop'] as const) {
      dispatch.formFactor = formFactor
      state.current = { ...CANNED, user: null }
      expect(text().toLowerCase(), formFactor).not.toContain(CAN_SIGN_UP.toLowerCase())
    }
  })

  it('names the eligible-empty case instead of blaming the filters', () => {
    for (const formFactor of ['mobile', 'desktop'] as const) {
      dispatch.formFactor = formFactor
      state.current = { ...CANNED, user: VIEWER, canSignUp: true, tasks: [] }
      const out = text()
      expect(out, formFactor).toContain(i18n.t('tasks:listPage.emptyEligible'))
      expect(out, formFactor).not.toContain(i18n.t('tasks:listPage.empty'))
    }
  })

  it('keeps the generic empty state when the filter is off', () => {
    dispatch.formFactor = 'desktop'
    state.current = { ...CANNED, user: VIEWER, canSignUp: false, tasks: [] }
    expect(text()).toContain(i18n.t('tasks:listPage.empty'))
  })
})

/** Status rail is a permission boundary; sort defaults to `level` (#1367). */
describe('the task rails', () => {
  const segmentCount = (markup: string) =>
    markup.split('filter-rail__segment').length - 1

  const SEES_EVERYTHING: CurrentUser = {
    ...VIEWER,
    can_see_retired_tasks: true,
    can_see_pending_tasks: true,
  }

  it('gives a logged-out viewer two status segments, not four', () => {
    dispatch.formFactor = 'desktop'
    state.current = { ...CANNED, user: null, statusFilters: ['All', 'active'] }
    const out = html()
    expect(out, 'no retired segment').not.toContain(
      `>${i18n.t('tasks:browse.status.retired')}<`,
    )
    expect(out, 'no pending segment').not.toContain(
      `>${i18n.t('tasks:browse.status.pending')}<`,
    )
    // sort (3) + status (2); no eligibility or type rail logged out (#1973).
    expect(segmentCount(out), 'five segments across two rails').toBe(5)
  })

  it('widens the status rail to four for a viewer allowed the extra states', () => {
    dispatch.formFactor = 'desktop'
    state.current = {
      ...CANNED,
      user: SEES_EVERYTHING,
      statusFilters: ['All', 'active', 'retired', 'pending'],
    }
    const out = html()
    expect(out).toContain(`>${i18n.t('tasks:browse.status.retired')}<`)
    expect(out).toContain(`>${i18n.t('tasks:browse.status.pending')}<`)
    // sort (3) + status (4) + eligibility (2); no type rail without
    // `can_apply_metatask` (#1973).
    expect(segmentCount(out), 'the status rail grew by two').toBe(9)
  })

  it('opens on `level`, raising no applied chip', () => {
    dispatch.formFactor = 'desktop'
    state.current = { ...CANNED, user: VIEWER }
    const out = html()
    expect(out, 'the level segment is the selected one').toContain(
      `aria-pressed="true">${i18n.t('common:filters.bar.sort.level')}<`,
    )
    expect(out, 'a default rail is not an applied filter').not.toContain(
      'filter-bar__applied',
    )
  })
})

/**
 * #2763: below 768px a card fills its column (`width: 100%`), so `items-center`
 * would shrink it to its content. Both arms must stretch.
 */
describe('the mobile results column stretches its cards (#2763)', () => {
  function resultsColumnClass(): string {
    const m = /class="([^"]*)"[^>]*data-testid="mobile-tasks-results"/.exec(html())
    if (m === null) throw new Error('mobile results column was not rendered')
    return m[1]
  }

  it('lets a task card fill the column instead of centring it', () => {
    dispatch.formFactor = 'mobile'
    state.current = { ...CANNED, user: VIEWER, tasks: [TASK] }
    expect(resultsColumnClass()).not.toContain('items-center')
  })

  it('leaves the metatask seal stack full-bleed', () => {
    dispatch.formFactor = 'mobile'
    state.current = {
      ...CANNED,
      user: VIEWER,
      taskType: 'metatask',
      tasks: [aTask({ id: 91, task_type: 'metatask', metatask_faction_slug: 'coven' })],
    }
    expect(resultsColumnClass()).not.toContain('items-center')
  })
})
