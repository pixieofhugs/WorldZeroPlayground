import { useTranslation } from 'react-i18next'
import FilterBar, { factionFacet, type FilterRail } from '../../components/ui/FilterBar'
import { UNFILTERED_ERA_SCOPE } from './feedFilterParams'
import type { PraxesFeedState, SortOrder, VotedFilter, EraScope } from './usePraxes'

/**
 * The praxis feed's rails, in one place (#1366, epic #1361).
 *
 * Desktop and mobile mount THIS, not two `<FilterBar>` invocations: the whole
 * point of the epic is that four hand-maintained filter rows become one, and
 * building the same three rails twice would have kept two. It replaces
 * `FilterStamps` ×3 + `FilterFactionTabs` on the desktop page and `ChipRow` ×3 +
 * `FactionSigilRow` on the mobile stream, along with both pages' inline-styled
 * search inputs — the bar owns the search box now.
 *
 * The type rail (solo / collab / duel) is NOT here: deleted on purpose,
 * #1361 ruling 2.
 *
 * `summary` carries the count, as the design draws it (#2262). The objection
 * that kept the slot empty was to printing one number TWICE — both headers used
 * to state it as well — and the answer is to state it once, here, beside the
 * controls that change it. Neither header prints it now; this is the only copy,
 * and it is the bar's because the bar is what moves it.
 *
 * It names the WINDOW rather than stating a bare number (#2384) — see
 * `TaskFilterBar` for why, and for why the branch is `hasMore` rather than a
 * length comparison. Same wording on both lists, on purpose.
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
      // NOT the landing value. The feed lands on `this_era`, so pointing the
      // rail's "not filtering" value at `all_eras` is what raises the "This era"
      // chip on first load — present and removable, which is the honesty the
      // narrowed default is allowed on (#1366). See UNFILTERED_ERA_SCOPE.
      defaultValue: UNFILTERED_ERA_SCOPE,
      segments: [
        { value: 'this_era', label: tc('filters.bar.era.current') },
        { value: 'all_eras', label: tc('filters.bar.era.all') },
      ],
      onChange: (value) => setFilters({ eraScope: value as EraScope }),
    },
    // Hidden, not disabled, when logged out (#1361 ruling 8): `list_praxes`
    // ignores `voted` for an anonymous viewer, so the control did nothing.
    ...(canFilterByVote
      ? [
          {
            key: 'voted',
            label: t('listPage.filter.showLabel'),
            value: filters.voted,
            defaultValue: 'all',
            segments: [
              { value: 'all', label: t('listPage.filter.all') },
              // "Needs my vote", not "I haven't voted": the backend filter also
              // excludes praxes your account co-owns, which can never be voted
              // (ADR-0013), so this wording is the accurate one.
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
      // The list's own `data-stale` condition, not bare `loading` — see
      // `TaskFilterBar` for why a first load is not an "update" (#2431).
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
