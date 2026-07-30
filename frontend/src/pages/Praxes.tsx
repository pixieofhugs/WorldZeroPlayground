import { useTranslation } from 'react-i18next'
import PraxisCard from '../components/praxisCard/PraxisCard'
import PageTitle from '../components/ui/PageTitle'
import FilterStamps from '../components/ui/FilterStamps'
import FilterFactionTabs from '../components/ui/FilterFactionTabs'
import { extractError } from '../utils/errors'
import { useFormFactor } from '../hooks/useFormFactor'
import { usePraxes, type PraxesFeedState, type VotedFilter, type SortOrder, type PraxisTypeFilter } from './praxes/usePraxes'
import MobilePraxisFeed from './praxes/MobilePraxisFeed'

/**
 * Praxis feed. `usePraxes()` owns the single filtered/sorted fetch (#644); on a
 * phone (#499) `useFormFactor() === 'mobile'` swaps the wrapped desktop card grid
 * for the single-column mobile proof stream. Both form factors render the filter
 * row and read the same shared feed state.
 */
export default function Praxes() {
  const formFactor = useFormFactor()
  const state = usePraxes()

  if (formFactor === 'mobile') return <MobilePraxisFeed state={state} />

  return <DesktopPraxes state={state} />
}

function DesktopPraxes({ state }: { state: PraxesFeedState }) {
  const { t } = useTranslation('praxis')
  const { t: tc } = useTranslation('common')
  const {
    items,
    loading,
    error,
    isEmpty,
    hasActiveFilters,
    factions,
    type,
    setType,
    faction,
    setFaction,
    voted,
    setVoted,
    sort,
    setSort,
    query,
    setQuery,
    taskId,
    clearTaskFilter,
    hasMore,
    loadMore,
  } = state

  return (
    <div className="py-8">
      <PageTitle title={t('listPage.title')} eyebrow={t('listPage.count', { count: items.length })} />
      {/* A `?task_id=` feed is a subset, so it must not keep claiming to be
          "all praxes from across World Zero" (#1050) — it says what it is and
          offers the way out. */}
      {taskId === null ? (
        <p className="font-body content-text text-muted mb-6">{t('listPage.intro')}</p>
      ) : (
        <p className="font-body content-text text-muted mb-6">
          {t('listPage.taskFilter.notice')}{' '}
          <button type="button" onClick={clearTaskFilter} className="underline">
            {t('listPage.taskFilter.clear')}
          </button>
        </p>
      )}

      {/* Filters (Style Guide §5.3) — bare stack, reusing the shared filter chips. */}
      <div className="flex flex-col gap-2.5 mb-6">
        <FilterFactionTabs factions={factions} value={faction} onChange={setFaction} />
        <FilterStamps
          label={t('listPage.filter.typeLabel')}
          options={['all', 'solo', 'collab', 'duel']}
          value={type}
          onChange={(next) => setType(next as PraxisTypeFilter)}
          optionLabels={{
            all: t('listPage.filter.all'),
            solo: tc('praxisType.solo'),
            collab: tc('praxisType.collab'),
            duel: tc('praxisType.duel'),
          }}
        />
        <FilterStamps
          label={t('listPage.filter.showLabel')}
          options={['all', 'no', 'yes']}
          value={voted === '' ? 'all' : voted}
          onChange={(next) => setVoted(next === 'all' ? '' : (next as VotedFilter))}
          optionLabels={{
            all: t('listPage.filter.all'),
            no: t('listPage.filter.needsMyVote'),
            yes: t('listPage.filter.voted'),
          }}
        />
        <FilterStamps
          label={tc('filters.sort')}
          options={['newest', 'oldest']}
          value={sort}
          onChange={(next) => setSort(next as SortOrder)}
          optionLabels={{
            newest: t('listPage.filter.sortNewest'),
            oldest: t('listPage.filter.sortOldest'),
          }}
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('listPage.filter.searchPlaceholder')}
          aria-label={t('listPage.filter.searchLabel')}
          className="font-body"
          style={{
            fontSize: 'var(--text-sm)',
            padding: 'var(--space-sm) var(--space-md)',
            maxWidth: 320,
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-strong)',
            color: 'var(--color-text-primary)',
            borderRadius: 4,
          }}
        />
      </div>

      {loading && items.length === 0 ? (
        <p className="font-body text-muted">{t('listPage.loading')}</p>
      ) : error ? (
        <p className="font-body content-text text-red-600 border-2 border-red-300 px-3 py-2">
          {extractError(error, "Couldn't load praxes.")}{' '}
          <button onClick={() => window.location.reload()} className="underline">{tc('states.tryRefreshing')}</button>
        </p>
      ) : isEmpty ? (
        <p className="font-body text-muted">
          {hasActiveFilters ? t('listPage.emptyFiltered') : t('listPage.empty')}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 items-start">
            {items.map((p) => (
              <PraxisCard key={`praxis-${p.id}`} praxis={p} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={loadMore}
                className="font-body uppercase"
                style={{
                  fontSize: 'var(--text-sm)',
                  letterSpacing: '0.1em',
                  padding: 'var(--space-sm) var(--space-lg)',
                  border: '1px solid var(--color-border-strong)',
                  background: 'var(--color-bg-surface)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {t('listPage.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
