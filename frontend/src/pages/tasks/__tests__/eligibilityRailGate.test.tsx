/**
 * The eligibility rail is offered only to a viewer carrying a character (#1972);
 * the applied chip is the one tap back. Defaults live in `taskFilterParams.test.ts`.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { CurrentUser } from '../../../api/auth'
import type { TasksState } from '../useTasks'
import TaskFilterBar from '../TaskFilterBar'

const BASE_VIEWER: CurrentUser = {
  account_id: 1,
  email: 'wz_pilgrim@example.com',
  provider: 'google',
  character: null,
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
  can_comment: false,
  can_vote: true,
  vote_level_required: 1,
  albescent_level_required: 8,
  second_character_level_required: 5,
  era_name: 'Era 1',
  level_jump_reach: 0,
  level_jump_available: false,
  task_browse_defaults_to_eligible: false,
}

/** Level 0: the viewer the server sets `task_browse_defaults_to_eligible` for (#2025). */
const WITH_CHARACTER: CurrentUser = {
  ...BASE_VIEWER,
  character: { level: 0, faction_slug: 'na' } as never,
  task_browse_defaults_to_eligible: true,
}

function mkState(user: CurrentUser | null, canSignUp: boolean): TasksState {
  return {
    user,
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
    canSignUp,
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
}

/** Raw markup: `SegmentedRail` carries the rail's own label in `aria-label`. */
function text(user: CurrentUser | null, canSignUp = false): string {
  return renderToStaticMarkup(<TaskFilterBar state={mkState(user, canSignUp)} />)
}

const ELIGIBILITY_RAIL = `aria-label="${i18n.t('tasks:browse.eligibility')}"`
const CAN_SIGN_UP = i18n.t('tasks:browse.canSignUp')

describe('the browse eligibility rail (#1972)', () => {
  it('is hidden from a signed-out visitor, who keeps the whole board', () => {
    expect(text(null)).not.toContain(ELIGIBILITY_RAIL)
  })

  it('is hidden from an account carrying no character', () => {
    expect(text(BASE_VIEWER)).not.toContain(ELIGIBILITY_RAIL)
  })

  it('is offered to a viewer who carries a character', () => {
    expect(text(WITH_CHARACTER)).toContain(ELIGIBILITY_RAIL)
    expect(text(WITH_CHARACTER)).toContain(CAN_SIGN_UP)
  })

  it('raises the applied chip while the filter is on, so it can be taken off', () => {
    const filtered = text(WITH_CHARACTER, true)
    expect(filtered).toContain(i18n.t('common:filters.bar.filteringBy'))
    expect(filtered).toContain(
      i18n.t('common:filters.bar.removeFilter', { label: CAN_SIGN_UP }),
    )
  })

  it('raises no chip once the filter is off', () => {
    expect(text(WITH_CHARACTER, false)).not.toContain(
      i18n.t('common:filters.bar.filteringBy'),
    )
  })
})
