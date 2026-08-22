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
 *     It is now viewer-gated on `can_apply_metatask` (#1973); see below.
 *
 * The eligibility rail (#1130) is gated on carrying a CHARACTER (#1972): the
 * server answers `[]` for an anonymous viewer, so it is a control that cannot
 * work logged out, and this page hides unusable controls rather than disabling
 * them (STYLE §1.4). It is also the one rail that need not open on its
 * `defaultValue` — the filter defaults ON for a LEVEL-0 character (#2025),
 * which raises its applied chip in the bar, and that chip's `×` is the one-tap
 * way back to the whole board. For every other player it opens on
 * `defaultValue` like the rest of the bar.
 * Status keeps its viewer-gated segment count for the same reason — `retired`
 * and `pending` are a permission boundary, and a logged-out viewer gets two
 * segments, not four.
 *
 * `summary` states how many tasks are on screen (#2262). It sits here rather
 * than in either header because the bar is what changes the number, and because
 * one component printing it is what keeps the desktop eyebrow and the mobile
 * caption from drifting apart — they both used to print it, in two spellings,
 * one of them hardcoded English.
 *
 * It names the WINDOW rather than stating a bare number (#2384): beside a
 * dropdown and a search box, "50 shown" reads as a page-size setting a player
 * could change, and the "Load more" that explains it is a page-scroll below. So
 * the copy branches on `hasMore` — the same flag that raises that button, never
 * `tasks.length === PAGE_LIMIT`, which is wrong once the window has grown.
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

  const rails: FilterRail[] = []

  // The type rail goes whole, not just its `metatask` segment (#1973). Stripping
  // one of two segments would leave a rail offering a single choice — chrome
  // that cannot change anything, which is the control this page hides rather
  // than disables (STYLE §1.4), same as the eligibility rail below.
  //
  // `can_apply_metatask` is the API's answer, never `level >= 5` here: the flag
  // carries Albescent's apply-level bypass, so a member below the level keeps
  // the rail. A client-side level comparison would silently take it away.
  //
  // A hand-typed `?type=metatask` still resolves without this rail — it counts
  // toward `appliedFilterCount`, so FilterBar raises clear-all, and
  // `clearedFilterParams` deletes the param.
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
  )

  // A CHARACTER, not merely a session (#1972): eligibility is a question about
  // a life, so an account between characters has nothing to ask it about, and
  // `readTaskFilters` forces the axis off for them. Same hide-don't-disable
  // rule as the type rail above.
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
      // The same `loading` the list branches on (#2431). While it is true the
      // count above is the PREVIOUS filter's, so the bar says it is updating
      // instead of restating a number it is about to replace.
      busy={loading}
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
 * Which empty state an empty task list gets (#1361 ruling 9).
 *
 * `caughtUp` stays `CanSignUpEmpty`'s job: a full task bank empties the eligible
 * list wholesale, and "you already hold twenty" is a different sentence from
 * "nothing matches" — see that component for why the count is the client's own.
 *
 * The pending branch (#1695) is the fourth, and it lives in
 * `selectTaskEmptyState` rather than in the shared `selectEmptyState`: the
 * praxis feed has no status rail, so this reason for an empty list is the task
 * page's alone. See that function for the two guards on the claim.
 */
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
  // `register` — nothing is filtered, so there is nothing to clear.
  return <FilterBarEmpty title={t('listPage.empty')} />
}
