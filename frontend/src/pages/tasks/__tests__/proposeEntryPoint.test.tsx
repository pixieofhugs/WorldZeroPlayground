/**
 * #1556 — `/tasks` is the ONLY home of "Propose a task".
 *
 * The affordance used to sit at the foot of the desktop rail and on each of the
 * eight mobile Field Desk skins. The desktop design's handoff note moved it
 * here: the sidebar is status and requests, not an authoring entry point.
 *
 * WHAT THIS FILE IS ACTUALLY GUARDING
 * -----------------------------------
 * Not "the button renders" — the gate. The issue's one hard constraint is that
 * moving the entry point must not change WHO gets one, and the rail's button
 * was ungated: it drew the route for every signed-in account, including ones
 * `POST /tasks` refuses. So the interesting assertions are the negative ones —
 * a viewer without `can_propose_task`, and a signed-out visitor, must see
 * nothing at all rather than a disabled control.
 *
 * BOTH form factors, because `/tasks` is now the only surface and a skin that
 * quietly dropped it would leave that player with no route to the composer
 * anywhere in the app.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { CurrentUser } from '../../../api/auth'
import type { TasksState } from '../useTasks'

const dispatch: { formFactor: 'mobile' | 'desktop' } = { formFactor: 'desktop' }

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => dispatch.formFactor,
}))

const VIEWER: CurrentUser = {
  account_id: 1,
  character: null,
  is_admin: false,
  can_create_additional_character: false,
  can_start_as_albescent: false,
  albescent_revealed: false,
  can_propose_task: true,
  can_propose_metatask: false,
  can_apply_metatask: false,
  can_see_retired_tasks: false,
  can_see_pending_tasks: false,
  can_comment: true,
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
  factionConfigs: [],
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

vi.mock('../useTasks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../useTasks')>()),
  useTasks: () => state.current,
}))

import Tasks from '../../Tasks'

const PROPOSE_LABEL = i18n.t('common:actions.proposeTask')

function renderFor(user: CurrentUser | null): string {
  state.current = { ...CANNED, user }
  return renderToStaticMarkup(
    <MemoryRouter>
      <Tasks />
    </MemoryRouter>,
  )
}

const FORM_FACTORS = ['desktop', 'mobile'] as const

describe('the propose entry point lives on /tasks', () => {
  for (const formFactor of FORM_FACTORS) {
    describe(formFactor, () => {
      it('offers the route to a viewer the server would accept', () => {
        dispatch.formFactor = formFactor
        const html = renderFor(VIEWER)
        expect(html, 'route').toContain('href="/propose-task"')
        expect(html, 'label').toContain(PROPOSE_LABEL)
      })

      it('renders nothing at all when the viewer cannot propose', () => {
        dispatch.formFactor = formFactor
        // Hide an unusable control; never draw it disabled. Both halves are
        // asserted because a disabled-but-present button would still carry the
        // href and still read as an offer.
        const html = renderFor({ ...VIEWER, can_propose_task: false })
        expect(html, 'route').not.toContain('/propose-task')
        expect(html, 'label').not.toContain(PROPOSE_LABEL)
      })

      it('renders nothing for a signed-out visitor', () => {
        dispatch.formFactor = formFactor
        const html = renderFor(null)
        expect(html).not.toContain('/propose-task')
      })
    })
  }

  it('guard: the label resolves, so the negative assertions are looking at something', () => {
    expect(PROPOSE_LABEL).toBe('Propose a Task')
  })
})
