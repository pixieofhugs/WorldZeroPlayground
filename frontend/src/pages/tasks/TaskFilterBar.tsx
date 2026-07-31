import { useTranslation } from 'react-i18next'
import FilterBar, {
  FilterBarEmpty,
  selectEmptyState,
  type FilterRail,
} from '../../components/ui/FilterBar'
import CanSignUpEmpty from './CanSignUpEmpty'
import {
  appliedFilterCount,
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
 * The task browse's filter bar — the shared `FilterBar` (#1365) wired to
 * `useTasks`, replacing BOTH hand-rolled filter rows: the desktop stamp stack
 * (`FilterStamps` × 2 + `FilterFactionTabs` + an inline search input) and the
 * mobile chip rows (`ChipRow` × 3 + `FactionSigilRow`).
 *
 * ONE component for both form factors, not a mobile twin: `FilterBar` is chrome
 * rather than a faction-dressed surface, so it sits outside the
 * `MOBILE_ARCHETYPE_BY_SLUG` seam and folds itself down on the phone.
 *
 * Four rails. Two of them are here because the alternative was worse:
 *
 *   - **sort** did not exist on this page at all. The page got
 *     `level_required ASC, point_value DESC` by sending no `sort`, so mounting a
 *     bare newest/oldest pair would have silently deleted the ladder ordering.
 *     Naming it `level` and defaulting to it keeps today's behaviour and makes
 *     it selectable. Ascending only — there is no level-descending option.
 *   - **task type** (#934) was a hand-rolled inline-styled toggle that no
 *     `FilterStamps` sweep would have caught, so leaving it would have shipped a
 *     stamp above a rail — the exact inconsistency this epic exists to remove.
 *
 * The eligibility rail (#1130) keeps its `user &&` gate: the server answers `[]`
 * for an anonymous viewer, so it is a control that cannot work logged out, and
 * this page hides unusable controls rather than disabling them (STYLE §1.4).
 * Status keeps its viewer-gated segment count for the same reason — `retired`
 * and `pending` are a permission boundary, and a logged-out viewer gets two
 * segments, not four.
 */
export default function TaskFilterBar({ state }: { state: TasksState }) {
  const { t } = useTranslation('tasks')
  const { t: tc } = useTranslation('common')
  const {
    user,
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

  // Keyed by the raw status the API expects, with the keys written out rather
  // than interpolated: the catalog types its keys as a union, so a template
  // literal does not typecheck — and a computed key is invisible to the
  // unused-key sweep either way.
  const statusLabels: Record<string, string> = {
    [TASK_STATUS_DEFAULT]: t('browse.status.all'),
    active: t('browse.status.active'),
    retired: t('browse.status.retired'),
    pending: t('browse.status.pending'),
  }

  const rails: FilterRail[] = [
    {
      key: 'type',
      label: t('browse.taskType'),
      value: taskType,
      defaultValue: TASK_TYPE_DEFAULT,
      segments: [
        { value: 'standard', label: t('browse.tasks') },
        { value: 'metatask', label: t('browse.metatasks') },
      ],
      onChange: (next) => setTaskType(next as TaskType),
    },
    {
      key: 'sort',
      label: tc('filters.bar.sortLabel'),
      // The default leads, as it does on every other rail here.
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
      // 2 segments logged out, 3 or 4 for a viewer allowed the extra states —
      // `statusFilters` is the permission boundary and the rail takes it whole.
      // The value stays the raw status the API expects; only the label is
      // localized. `FilterStamps` uppercased its options in CSS, so rendering
      // the bare value on a rail that does not would have shipped a mixed-case
      // row ("All active retired pending").
      segments: statusFilters.map((option) => ({
        value: option,
        label: statusLabels[option] ?? option,
      })),
      onChange: setStatus,
    },
  ]

  if (user) {
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
      factions={factions}
      selectedFactions={selectedFactions}
      onFactionsChange={setSelectedFactions}
      onClearAll={clearFilters}
      search={{
        value: query,
        onChange: setQuery,
        placeholder: t('listPage.filter.searchPlaceholder'),
        label: t('listPage.filter.searchLabel'),
      }}
    />
  )
}

/**
 * Which of the three empty states an empty task list gets (#1361 ruling 9).
 *
 * `caughtUp` stays `CanSignUpEmpty`'s job: a full task bank empties the eligible
 * list wholesale, and "you already hold twenty" is a different sentence from
 * "nothing matches" — see that component for why the count is the client's own.
 */
export function TaskListEmpty({ state }: { state: TasksState }) {
  const { t } = useTranslation('tasks')
  const kind = selectEmptyState(appliedFilterCount(state), state.canSignUp)

  if (kind === 'caughtUp') return <CanSignUpEmpty onClearAll={state.clearFilters} />
  if (kind === 'filtered') {
    return (
      <FilterBarEmpty
        title={t('listPage.emptyFiltered')}
        onClearAll={state.clearFilters}
      />
    )
  }
  // `register` — nothing is filtered, so there is nothing to clear.
  return <FilterBarEmpty title={t('listPage.empty')} />
}
