/**
 * #2384 — the count beside the filters must name the WINDOW, not read as a
 * page-size setting.
 *
 * Seam: `<TaskFilterBar>` / `<PraxisFilterBar>` → `FilterBar`'s
 * `filter-bar__summary` slot. Tested here rather than through `<Tasks>` /
 * `<Praxes>` because `renderToStaticMarkup` runs no effects, so a page render
 * never settles a fetch — `hasMore` is permanently false and the branch this
 * issue is about would never be exercised. Handing the bar a state object is
 * the only place both sides of it are reachable without a DOM.
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

// The bars read `.length` and nothing else off the rows, so the rows are
// stand-ins — a real `TaskOut`/`PraxisCardOut` ×50 would assert nothing extra.
const rows = <T,>(): T[] => Array.from({ length: COUNT }, () => ({}) as T)

const noop = () => {}

function taskState(hasMore: boolean): TasksState {
  return {
    user: null,
    tasks: rows(),
    loading: false,
    error: null,
    factions: [],
    factionConfigs: [],
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
    // The point of the issue: a bare "50" beside a dropdown reads as a page
    // size. "Showing first 50" cannot.
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
