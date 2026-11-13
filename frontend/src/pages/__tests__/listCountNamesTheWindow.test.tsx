/**
 * #2384 — the count beside the filters names the WINDOW, not a page size.
 * Tested on the filter bars, not the pages: under SSR a page never settles a
 * fetch, so `hasMore` would always be false.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../i18n'
import i18n from '../../i18n'
import TaskFilterBar from '../tasks/TaskFilterBar'
import PraxisFilterBar from '../praxes/PraxisFilterBar'
import { LANDING_FILTERS } from '../praxes/feedFilterParams'
import { TASK_SORT_DEFAULT, TASK_STATUS_DEFAULT, TASK_TYPE_DEFAULT, type TasksState } from '../tasks/useTasks'
import type { PraxesFeedState } from '../praxes/usePraxes'

const COUNT = 50

// The bars read only `.length`.
const rows = <T,>(): T[] => Array.from({ length: COUNT }, () => ({}) as T)

const noop = () => {}

function taskState(hasMore: boolean): TasksState {
  return {
    user: null,
    tasks: rows(),
    loading: false,
    error: null,
    factions: [],
    statusFilters: [TASK_STATUS_DEFAULT, 'active'],
    taskType: TASK_TYPE_DEFAULT,
    setTaskType: noop,
    sort: TASK_SORT_DEFAULT,
    setSort: noop,
    status: TASK_STATUS_DEFAULT,
    setStatus: noop,
    selectedFactions: [],
    setSelectedFactions: noop,
    canSignUp: false,
    setCanSignUp: noop,
    query: '',
    setQuery: noop,
    clearFilters: noop,
    hasMore,
    loadMore: noop,
    signupMsg: null,
    handleSignup: async () => {},
    displayPointsFor: () => 0,
    displayMultiplierFor: () => 1,
  }
}

function praxisState(hasMore: boolean): PraxesFeedState {
  return {
    items: rows(),
    loading: false,
    error: null,
    isEmpty: false,
    emptyState: 'register',
    factions: [],
    filters: LANDING_FILTERS,
    setFilters: noop,
    clearAllFilters: noop,
    canFilterByVote: false,
    query: '',
    setQuery: noop,
    taskId: null,
    clearTaskFilter: noop,
    hasMore,
    loadMore: noop,
  }
}

const summary = (bar: React.ReactElement): string =>
  renderToStaticMarkup(bar).match(
    /class="filter-bar__summary">([^<]*)</,
  )?.[1] ?? ''

const surfaces = [
  {
    page: 'tasks',
    bar: (hasMore: boolean) => <TaskFilterBar state={taskState(hasMore)} />,
    windowed: i18n.t('tasks:listPage.countWindowed', { count: COUNT }),
    whole: i18n.t('tasks:listPage.count', { count: COUNT }),
  },
  {
    page: 'praxis',
    bar: (hasMore: boolean) => <PraxisFilterBar state={praxisState(hasMore)} />,
    windowed: i18n.t('praxis:listPage.countWindowed', { count: COUNT }),
    whole: i18n.t('praxis:listPage.count', { count: COUNT }),
  },
]

describe.each(surfaces)('the $page count (#2384)', ({ bar, windowed, whole }) => {
  it('names the window while more rows remain', () => {
    expect(windowed).toMatch(/first/i)
    expect(summary(bar(true))).toBe(windowed)
  })

  it('says plainly that is everything once nothing remains', () => {
    expect(summary(bar(false))).toBe(whole)
  })

  it('does not print the same sentence in both states', () => {
    expect(windowed).not.toBe(whole)
  })
})
