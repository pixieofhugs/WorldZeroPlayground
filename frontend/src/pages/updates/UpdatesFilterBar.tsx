import { useTranslation } from 'react-i18next'
import FilterBar, {
  FilterBarEmpty,
  type FilterRail,
} from '../../components/ui/FilterBar'
import FeedEmptyState from '../../components/feed/FeedEmptyState'
import {
  RELATIONSHIPS,
  RELATIONSHIP_DEFAULT,
  RELATIONSHIP_LABEL_KEY,
  STATE_ARCHIVED,
  STATE_INBOX,
  selectUpdatesEmptyState,
  typeFacet,
  type FeedRelationship,
} from './updatesFilters'
import type { UpdatesState } from './useUpdates'

/**
 * The Updates page's filter bar: shared `FilterBar` (#1365) wired to
 * `useUpdates`, one component for both form factors.
 *
 * Deliberately absent from the design, don't "restore":
 *   - faction axis: `context_faction_slug` is computed, not a column (15 joins).
 *   - search: no text column (#1426).
 *   - audience multi-select: duplicates the relationship axis.
 *   - Snide-lime accent: a faction colour can't be site chrome. The rail ring's
 *     spectrum is the site default and must not be "fixed" (#1361).
 */
export default function UpdatesFilterBar({ state }: { state: UpdatesState }) {
  const { t } = useTranslation('feed')
  const { filters, setFilters, clearFilters, counts, items, loading } = state

  const rails: FilterRail[] = [
    {
      key: 'state',
      label: t('filter.stateLabel'),
      value: filters.archived ? STATE_ARCHIVED : STATE_INBOX,
      defaultValue: STATE_INBOX,
      // No count badge: an archived count would cost a second fan-out.
      segments: [
        { value: STATE_INBOX, label: t('filter.state.inbox') },
        { value: STATE_ARCHIVED, label: t('filter.state.archived') },
      ],
      onChange: (next) => setFilters({ archived: next === STATE_ARCHIVED }),
    },
  ]

  // Hidden on Archived: `_visible_types` ignores `filter` when `archived=true`.
  if (!filters.archived) {
    rails.push({
      key: 'relationship',
      label: t('filter.relationshipLabel'),
      value: filters.relationship,
      defaultValue: RELATIONSHIP_DEFAULT,
      segments: RELATIONSHIPS.map((relationship) => ({
        value: relationship,
        label: t(RELATIONSHIP_LABEL_KEY[relationship]),
      })),
      onChange: (next) => setFilters({ relationship: next as FeedRelationship }),
    })
  }

  return (
    <FilterBar
      rails={rails}
      facets={[
        typeFacet(counts.by_type, filters.types, (types) => setFilters({ types })),
      ]}
      onClearAll={clearFilters}
      // What is on screen (grows with "load older"), not a total.
      summary={loading ? undefined : t('page.showing', { count: items.length })}
    />
  )
}

/**
 * Which empty state an empty feed gets (#1361): filtered-to-nothing gets its own
 * copy; `FeedEmptyState` keeps the inbox vs archive split.
 */
export function UpdatesListEmpty({ state }: { state: UpdatesState }) {
  const { t } = useTranslation('feed')

  if (selectUpdatesEmptyState(state.filters) === 'filtered') {
    return (
      <FilterBarEmpty
        title={t('filter.emptyFiltered')}
        hint={t('filter.emptyFilteredHint')}
        onClearAll={state.clearFilters}
      />
    )
  }
  return <FeedEmptyState archivedView={state.archivedView} />
}
