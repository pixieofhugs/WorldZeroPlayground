import { useTranslation } from 'react-i18next'
import FilterBar, {
  factionFacet,
  FilterBarEmpty,
  type FilterRail,
} from '../../components/ui/FilterBar'
import CanSignUpEmpty from './CanSignUpEmpty'
import { useGameConfig } from '../../hooks/useGameConfig'
import {
  appliedFilterCount,
  PENDING_WINDOW_EMPTY,
  selectTaskEmptyState,
  TASK_SORT_DEFAULT,
  TASK_STATUS_DEFAULT,
  TASK_TYPE_DEFAULT,
  type TasksState,
} from './useTasks'
import type { TaskSort, TaskType } from '../../api/tasks'

/** The eligibility axis, as a rail: everything, or only what I can claim. */
const ELIGIBILITY_DEFAULT = 'all'
const ELIGIBILITY_ON = 'canSignUp'

/**
 * The task browse's filter bar: shared `FilterBar` (#1365) wired to `useTasks`,
 * one component for both form factors (chrome, outside `MOBILE_ARCHETYPE_BY_SLUG`).
 *
 * - sort `level` (the default) is the server's `level_required ASC, point_value
 *   DESC` ladder; there is no level-descending option.
 * - eligibility is the one rail that may open off its default: ON for a level-0
 *   character (#2025); its chip's `×` returns to the whole board.
 * - `summary` names the window (#2384), branching on `hasMore`, never
 *   `tasks.length === PAGE_LIMIT` (wrong once the window grows).
 */
export default function TaskFilterBar({ state }: { state: TasksState }) {
  const { t } = useTranslation('tasks')
  const { t: tc } = useTranslation('common')
  const {
    user,
    tasks,
    loading,
    hasMore,
    factions,
    statusFilters,
    taskType,
    setTaskType,
    sort,
    setSort,
    status,
    setStatus,
    selectedFactions,
    setSelectedFactions,
    canSignUp,
    setCanSignUp,
    query,
    setQuery,
    clearFilters,
  } = state

  // Keys written out: a template literal doesn't typecheck against the catalog
  // union and is invisible to the unused-key sweep.
  const statusLabels: Record<string, string> = {
    [TASK_STATUS_DEFAULT]: t('browse.status.all'),
    active: t('browse.status.active'),
    retired: t('browse.status.retired'),
    pending: t('browse.status.pending'),
  }

  const rails: FilterRail[] = []

  // The whole rail hides (#1973): a one-segment rail can't change anything.
  // `can_apply_metatask`, never `level >= 5`: the flag carries Albescent's
  // apply-level bypass. A hand-typed `?type=metatask` still counts toward
  // `appliedFilterCount`, so clear-all removes it.
  if (user?.can_apply_metatask) {
    rails.push({
      key: 'type',
      label: t('browse.taskType'),
      value: taskType,
      defaultValue: TASK_TYPE_DEFAULT,
      segments: [
        { value: 'standard', label: t('browse.tasks') },
        { value: 'metatask', label: t('browse.metatasks') },
      ],
      onChange: (next) => setTaskType(next as TaskType),
    })
  }

  rails.push(
    {
      key: 'sort',
      label: tc('filters.bar.sortLabel'),
      segments: [
        { value: 'level', label: tc('filters.bar.sort.level') },
        { value: 'newest', label: tc('filters.bar.sort.newest') },
        { value: 'oldest', label: tc('filters.bar.sort.oldest') },
      ],
      value: sort,
      defaultValue: TASK_SORT_DEFAULT,
      onChange: (next) => setSort(next as TaskSort),
    },
    {
      key: 'status',
      label: tc('filters.status'),
      value: status,
      defaultValue: TASK_STATUS_DEFAULT,
      // `statusFilters` is the permission boundary (2 segments logged out, up
      // to 4); value stays the raw API status, only the label is localized.
      segments: statusFilters.map((option) => ({
        value: option,
        label: statusLabels[option] ?? option,
      })),
      onChange: setStatus,
    },
  )

  // A character, not merely a session (#1972); `readTaskFilters` forces the
  // axis off without one.
  if (user?.character) {
    rails.push({
      key: 'eligibility',
      label: t('browse.eligibility'),
      value: canSignUp ? ELIGIBILITY_ON : ELIGIBILITY_DEFAULT,
      defaultValue: ELIGIBILITY_DEFAULT,
      segments: [
        { value: ELIGIBILITY_DEFAULT, label: t('browse.allTasks') },
        { value: ELIGIBILITY_ON, label: t('browse.canSignUp') },
      ],
      onChange: (next) => setCanSignUp(next === ELIGIBILITY_ON),
    })
  }

  return (
    <FilterBar
      rails={rails}
      facets={[factionFacet(factions, selectedFactions, setSelectedFactions)]}
      onClearAll={clearFilters}
      summary={t(hasMore ? 'listPage.countWindowed' : 'listPage.count', {
        count: tasks.length,
      })}
      // Same condition as the list's `data-stale`, not bare `loading` (#2431):
      // a first load has no stale rows and the list already says "Loading".
      busy={loading && tasks.length > 0}
      search={{
        value: query,
        onChange: setQuery,
        placeholder: t('listPage.filter.searchPlaceholder'),
        label: t('listPage.filter.searchLabel'),
      }}
    />
  )
}

/** Which empty state an empty task list gets (#1361); see `selectTaskEmptyState`. */
export function TaskListEmpty({ state }: { state: TasksState }) {
  const { t } = useTranslation('tasks')
  const adminReviewHours =
    useGameConfig()?.pending_task_admin_review_hours ?? null
  const kind = selectTaskEmptyState(
    state.status,
    appliedFilterCount(state),
    state.canSignUp,
    adminReviewHours,
  )

  if (kind === PENDING_WINDOW_EMPTY) {
    return (
      <FilterBarEmpty
        title={t('listPage.emptyPending')}
        hint={t('listPage.emptyPendingHint', { hours: adminReviewHours })}
        onClearAll={state.clearFilters}
      />
    )
  }
  if (kind === 'caughtUp') return <CanSignUpEmpty onClearAll={state.clearFilters} />
  if (kind === 'filtered') {
    return (
      <FilterBarEmpty
        title={t('listPage.emptyFiltered')}
        onClearAll={state.clearFilters}
      />
    )
  }
  return <FilterBarEmpty title={t('listPage.empty')} />
}
