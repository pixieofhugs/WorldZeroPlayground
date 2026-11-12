/**
 * The metatask option is gated on `can_apply_metatask`, never a level
 * comparison (#1973): Albescent's bypass grants it at level 0.
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

function mkState(user: CurrentUser | null): TasksState {
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
}

/** Raw markup: `SegmentedRail` carries the rail's own label in `aria-label`. */
function text(user: CurrentUser | null): string {
  return renderToStaticMarkup(<TaskFilterBar state={mkState(user)} />)
}

const METATASKS = i18n.t('tasks:browse.metatasks')
const TYPE_RAIL = `aria-label="${i18n.t('tasks:browse.taskType')}"`

describe('the browse filter metatask option (#1973)', () => {
  it('is hidden from a viewer who cannot apply a metatask', () => {
    const out = text({ ...BASE_VIEWER, can_apply_metatask: false })
    expect(out).not.toContain(METATASKS)
    // The whole rail goes: one segment is a dead rail.
    expect(out).not.toContain(TYPE_RAIL)
  })

  it('is shown to a viewer who can apply a metatask', () => {
    const out = text({ ...BASE_VIEWER, can_apply_metatask: true })
    expect(out).toContain(METATASKS)
    expect(out).toContain(TYPE_RAIL)
  })

  it('is shown to an Albescent member below the apply level', () => {
    const albescentBelowLevel: CurrentUser = {
      ...BASE_VIEWER,
      can_apply_metatask: true,
      character: { level: 0, faction_slug: 'albescent' } as never,
    }
    expect(text(albescentBelowLevel)).toContain(METATASKS)
  })

  it('is hidden from a logged-out viewer', () => {
    expect(text(null)).not.toContain(METATASKS)
  })
})
