import { useTranslation } from 'react-i18next'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import PraxisCard from '../components/praxisCard/PraxisCard'
import PageTitle from '../components/ui/PageTitle'
import { usePraxes } from './praxes/usePraxes'
import PraxisFilterBar from './praxes/PraxisFilterBar'
import PraxisFeedEmpty from './praxes/PraxisFeedEmpty'

/** Praxis feed: one `usePraxes()` fetch (#644), one responsive page (#499). */
export default function Praxes() {
  const { t } = useTranslation('praxis')
  useDocumentTitle(t('listPage.title'))
  const state = usePraxes()
  const { t: tc } = useTranslation('common')
  const {
    items,
    loading,
    error,
    isEmpty,
    emptyState,
    clearAllFilters,
    taskId,
    clearTaskFilter,
    hasMore,
    loadMore,
  } = state

  return (
    <div className="py-8">
      {/* No eyebrow: the count is in the filter bar (#2262). */}
      <PageTitle title={t('listPage.title')} />
      {/* A `?task_id=` feed is a subset (#1050); the bar's chips don't show it. */}
      {taskId !== null && (
        <p className="font-body content-text text-muted mb-6">
          {t('listPage.taskFilter.notice')}{' '}
          <button type="button" onClick={clearTaskFilter} className="underline">
            {t('listPage.taskFilter.clear')}
          </button>
        </p>
      )}

      <div className="mb-6">
        <PraxisFilterBar state={state} />
      </div>

      {loading && items.length === 0 ? (
        <p className="font-body text-muted">{t('listPage.loading')}</p>
      ) : error ? (
        <p className="font-body content-text danger-text border-2 danger-edge px-3 py-2">
          {t('listPage.loadError')}{' '}
          <button onClick={() => window.location.reload()} className="underline">{tc('states.tryRefreshing')}</button>
        </p>
      ) : isEmpty ? (
        <PraxisFeedEmpty kind={emptyState} onClearAll={clearAllFilters} />
      ) : (
        <>
          <div
            className="flex flex-wrap gap-4 items-start"
            /* Stale rows dim until the read lands (#2431). */
            data-stale={loading && items.length > 0 ? 'true' : undefined}
          >
            {items.map((p) => (
              <PraxisCard key={`praxis-${p.id}`} praxis={p} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={loadMore}
                className="font-body uppercase w-full md:w-auto"
                style={{
                  fontSize: 'var(--text-md)',
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
