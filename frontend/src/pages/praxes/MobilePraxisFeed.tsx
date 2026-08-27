import { useTranslation } from 'react-i18next'
import PraxisCard from '../../components/praxisCard/PraxisCard'
import PraxisFilterBar from './PraxisFilterBar'
import PraxisFeedEmpty from './PraxisFeedEmpty'
import type { PraxesFeedState } from './usePraxes'

/**
 * Mobile praxis feed (#499/#565/#573/#644) — a phone-native proof stream. What
 * survives here is the PAGE chrome: the stacked header and the results list. The
 * page itself stays faction-agnostic; each card picks its own bespoke skin from
 * its item's data. Solo + collab/duel are one uniform, date-ordered stream.
 *
 * The filter row is no longer hand-rolled here. `ChipRow`/`Chip` ×3, the
 * `FactionSigilRow` and the inline-styled search box are replaced by the shared
 * `<PraxisFilterBar>` (#1366) — the same one the desktop feed mounts, which is
 * responsive by itself and needs no mobile twin. That also settles a drift: the
 * chips let you deselect "needs my vote" back to "all", which the desktop stamps
 * did not. A rail always has exactly one segment selected, so "every praxis" is
 * now an explicit choice on both surfaces (or the chip's ×).
 *
 * The results list renders the SHARED `<PraxisCard>` (ADR-0067) — the same
 * component the desktop feed renders. There is no mobile twin: a faction's
 * praxis card is one responsive file under `components/praxisCard/desktop/`.
 *
 * The list is a WRAPPING FLEX ROW, not a column, because that is what the
 * card's `frameBase` geometry expects: `flex: 1 1 394px` with `minWidth: 280`
 * resolves to exactly one full-width card per row on a phone, and to a grid on
 * anything wider. A column container would apply that basis to the card's
 * HEIGHT instead, which is the one arrangement the shared frame cannot take.
 *
 * Presentation-only: data + filter state arrive via {@link PraxesFeedState}.
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
        {/* A `?task_id=` feed is a subset (#1050) — say so, and offer the way
            out, so a narrowed stream can't read as the whole register. The
            filter bar's chip row does not speak for it. */}
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
        /* Stale rows dim and stop taking taps until the read lands (#2431).
           Unlike the desktop page, "Load more" is a CHILD of this wrap
           container rather than a sibling — re-parenting it would take it out
           of the flex flow it is laid out by — so it dims with the rows. That
           is the right behaviour here anyway: growing the window mid-flight
           only starts a second read over the first. */
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
