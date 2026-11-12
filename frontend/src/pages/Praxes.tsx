import { useTranslation } from 'react-i18next'
import PraxisCard from '../components/praxisCard/PraxisCard'
import PageTitle from '../components/ui/PageTitle'
import { extractError } from '../utils/errors'
import { useFormFactor } from '../hooks/useFormFactor'
import { usePraxes, type PraxesFeedState } from './praxes/usePraxes'
import PraxisFilterBar from './praxes/PraxisFilterBar'
import PraxisFeedEmpty from './praxes/PraxisFeedEmpty'
import MobilePraxisFeed from './praxes/MobilePraxisFeed'

/** Praxis feed: one `usePraxes()` fetch (#644), desktop grid or mobile stream (#499). */
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
          {extractError(error, "Couldn't load praxes.")}{' '}
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
                className="font-body uppercase"
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
