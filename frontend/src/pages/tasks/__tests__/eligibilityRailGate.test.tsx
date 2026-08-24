/**
 * The eligibility rail is offered only to a viewer who carries a character
 * (#1972), and the applied chip is the one tap back to the whole board.
 *
 * The seam this guards is the signed-out board. The filter now defaults ON,
 * and the way that flip could break `/tasks` — which is public, and is the shop
 * window — is by reaching a viewer who has no eligibility to compute: the rail
 * would sit there matching nothing. `readTaskFilters` forces the axis off for
 * them (see `taskFilterParams.test.ts`); this pins the chrome half, that the
 * control is ABSENT rather than present and dead (STYLE §1.4).
 *
 * The default itself is not asserted here on purpose: the bar takes `canSignUp`
 * as a value and does not decide it. Which viewer gets which default is the
 * reader's call, and it is pinned where the reader lives.
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

/**
 * The brand-new player the default exists for: level 0, one startable task —
 * which since #2025 is exactly the viewer the server sets
 * `task_browse_defaults_to_eligible` for.
 */
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
    // A session is not a life. There is no level, no faction and no task bank
    // to evaluate, so the control could only ever match nothing.
    expect(text(BASE_VIEWER)).not.toContain(ELIGIBILITY_RAIL)
  })

  it('is offered to a viewer who carries a character', () => {
    expect(text(WITH_CHARACTER)).toContain(ELIGIBILITY_RAIL)
    expect(text(WITH_CHARACTER)).toContain(CAN_SIGN_UP)
  })

  it('raises the applied chip while the filter is on, so it can be taken off', () => {
    // The chip's × is what makes an ON-by-default filter honest: the board says
    // it is narrowed and hands over the way out, in the bar, before the player
    // has to find the rail.
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
