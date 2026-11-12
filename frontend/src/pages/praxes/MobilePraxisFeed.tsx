import { useTranslation } from 'react-i18next'
import PraxisCard from '../../components/praxisCard/PraxisCard'
import PraxisFilterBar from './PraxisFilterBar'
import PraxisFeedEmpty from './PraxisFeedEmpty'
import type { PraxesFeedState } from './usePraxes'

/**
 * Mobile praxis feed: page chrome only; filters are the shared
 * `<PraxisFilterBar>` and cards the shared `<PraxisCard>` (ADR-0067).
 *
 * The list is a WRAPPING FLEX ROW, not a column: the card's `frameBase`
 * (`flex: 1 1 394px`, `minWidth: 280`) would otherwise apply its basis to HEIGHT.
 */
export default function MobilePraxisFeed({ state }: { state: PraxesFeedState }) {
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
    <div data-feed="mobile" className="page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <header>
        <div className="label-heading">
          {tc('nav.praxis')}
        </div>
        <h1
          className="font-display italic"
          style={{ fontSize: 'var(--text-heading)', lineHeight: 1, color: 'var(--color-text-primary)', margin: 0 }}
        >
          {t('listPage.title')}
        </h1>
        {/* A `?task_id=` feed is a subset (#1050); the chip row doesn't show it. */}
        {taskId !== null && (
          <p className="font-body content-text text-muted" style={{ marginTop: 'var(--space-xs)' }}>
            {t('listPage.taskFilter.notice')}{' '}
            <button type="button" onClick={clearTaskFilter} className="underline">
              {t('listPage.taskFilter.clear')}
            </button>
          </p>
        )}
      </header>

      <PraxisFilterBar state={state} />

      {loading && items.length === 0 ? (
        <p className="font-body text-muted">{t('listPage.loading')}</p>
      ) : error ? (
        <p className="font-body content-text danger-text border-2 danger-edge px-3 py-2">
          {t('detail.errors.load')}{' '}
          <button onClick={() => window.location.reload()} className="underline">
            {tc('states.tryRefreshing')}
          </button>
        </p>
      ) : isEmpty ? (
        <PraxisFeedEmpty kind={emptyState} onClearAll={clearAllFilters} />
      ) : (
        /* Stale rows dim (#2431). "Load more" is a child here (flex flow), so it
           dims too, which avoids a second read mid-flight. */
        <div
          className="flex flex-wrap gap-4 items-start"
          data-stale={loading && items.length > 0 ? 'true' : undefined}
        >
          {items.map((p) => (
            <PraxisCard key={`praxis-${p.id}`} praxis={p} />
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              className="font-body uppercase w-full"
              style={{
                fontSize: 'var(--text-md)',
                letterSpacing: '0.1em',
                padding: 'var(--space-md)',
                border: '1px solid var(--color-border-strong)',
                background: 'var(--color-bg-surface)',
                color: 'var(--color-text-primary)',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {t('listPage.loadMore')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
