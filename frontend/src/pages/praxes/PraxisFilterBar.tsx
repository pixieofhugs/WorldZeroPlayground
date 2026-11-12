import { useTranslation } from 'react-i18next'
import FilterBar, { factionFacet, type FilterRail } from '../../components/ui/FilterBar'
import { UNFILTERED_ERA_SCOPE } from './feedFilterParams'
import type { PraxesFeedState, SortOrder, VotedFilter, EraScope } from './usePraxes'

/**
 * The praxis feed's rails, mounted by both desktop and mobile (#1366). No type
 * rail (#1361 ruling 2). `summary` is the only place the count is printed
 * (#2262) and names the window (#2384, see `TaskFilterBar`).
 */
export default function PraxisFilterBar({ state }: { state: PraxesFeedState }) {
  const { t } = useTranslation('praxis')
  const { t: tc } = useTranslation('common')
  const {
    items,
    loading,
    filters,
    setFilters,
    clearAllFilters,
    canFilterByVote,
    factions,
    hasMore,
  } = state

  const rails: FilterRail[] = [
    {
      key: 'sort',
      label: tc('filters.bar.sortLabel'),
      value: filters.sort,
      defaultValue: 'newest',
      segments: [
        { value: 'newest', label: tc('filters.bar.sort.newest') },
        { value: 'oldest', label: tc('filters.bar.sort.oldest') },
        { value: 'most_voted', label: tc('filters.bar.sort.mostVoted') },
        { value: 'least_voted', label: tc('filters.bar.sort.leastVoted') },
      ],
      onChange: (value) => setFilters({ sort: value as SortOrder }),
    },
    {
      key: 'era',
      label: tc('filters.bar.eraLabel'),
      value: filters.eraScope,
      // NOT the landing value: so the "This era" chip shows on first load (#1366).
      defaultValue: UNFILTERED_ERA_SCOPE,
      segments: [
        { value: 'this_era', label: tc('filters.bar.era.current') },
        { value: 'all_eras', label: tc('filters.bar.era.all') },
      ],
      onChange: (value) => setFilters({ eraScope: value as EraScope }),
    },
    // Hidden when logged out: `list_praxes` ignores `voted` for anon (#1361).
    ...(canFilterByVote
      ? [
          {
            key: 'voted',
            label: t('listPage.filter.showLabel'),
            value: filters.voted,
            defaultValue: 'all',
            segments: [
              { value: 'all', label: t('listPage.filter.all') },
              // "Needs my vote": the filter also excludes co-owned praxes (ADR-0013).
              { value: 'no', label: t('listPage.filter.needsMyVote') },
              { value: 'yes', label: t('listPage.filter.voted') },
            ],
            onChange: (value: string) => setFilters({ voted: value as VotedFilter }),
          } satisfies FilterRail,
        ]
      : []),
  ]

  return (
    <FilterBar
      rails={rails}
      facets={[
        factionFacet(factions, filters.factions, (slugs) =>
          setFilters({ factions: slugs }),
        ),
      ]}
      onClearAll={clearAllFilters}
      summary={t(hasMore ? 'listPage.countWindowed' : 'listPage.count', {
        count: items.length,
      })}
      // Same as the list's `data-stale` (#2431, see `TaskFilterBar`).
      busy={loading && items.length > 0}
      search={{
        value: state.query,
        onChange: state.setQuery,
        placeholder: t('listPage.filter.searchPlaceholder'),
        label: t('listPage.filter.searchLabel'),
      }}
    />
  )
}
