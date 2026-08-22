/**
 * The browse filter's metatask option is offered only to a viewer the API says
 * may apply a metatask (#1973).
 *
 * The gate is `CurrentUser.can_apply_metatask`, never a level comparison here.
 * That distinction is the point of the Albescent case below: Albescent carries
 * `can_apply_metatask_at_any_level`, so a level-0 member is entitled to the
 * rail, and a client-side `level >= era.metatask_apply_level` would take it
 * away from exactly the players whose charter grants it.
 *
 * The whole `type` rail goes, not just the segment — a rail down to one segment
 * is chrome that cannot change anything.
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
  character: null,
  is_admin: false,
  can_create_additional_character: false,
  can_start_as_albescent: false,
  albescent_revealed: false,
  can_propose_task: false,
  can_propose_metatask: false,
  can_apply_metatask: false,
  can_see_retired_tasks: false,
  can_see_pending_tasks: false,
  can_comment: false,
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
}

/** Raw markup, not stripped: `SegmentedRail` puts the rail's own label in
 *  `aria-label`, so the whole-rail assertions need the attributes. */
function text(user: CurrentUser | null): string {
  return renderToStaticMarkup(<TaskFilterBar state={mkState(user)} />)
}

const METATASKS = i18n.t('tasks:browse.metatasks')
const TYPE_RAIL = `aria-label="${i18n.t('tasks:browse.taskType')}"`

describe('the browse filter metatask option (#1973)', () => {
  it('is hidden from a viewer who cannot apply a metatask', () => {
    const out = text({ ...BASE_VIEWER, can_apply_metatask: false })
    expect(out).not.toContain(METATASKS)
    // The whole rail goes, not just the segment — one segment is a dead rail.
    expect(out).not.toContain(TYPE_RAIL)
  })

  it('is shown to a viewer who can apply a metatask', () => {
    const out = text({ ...BASE_VIEWER, can_apply_metatask: true })
    expect(out).toContain(METATASKS)
    expect(out).toContain(TYPE_RAIL)
  })

  it('is shown to an Albescent member below the apply level', () => {
    // The case a level comparison gets wrong. The member is level 0; their
    // faction's bypass is what makes `can_apply_metatask` true, and the bar
    // must take the API at its word rather than re-deriving from the level.
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
