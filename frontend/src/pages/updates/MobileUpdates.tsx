import { useTranslation } from 'react-i18next'
import FeedCardRouter from '../../components/feed/FeedCardRouter'
import FeedDateDivider, { getDateLabel } from '../../components/feed/FeedDateDivider'
import {
  ALL_FILTERS,
  getCount,
  type FeedFilter,
  type UpdatesState,
} from './useUpdates'

/**
 * Mobile Updates stream (#532). One scroll-native, single-column activity feed
 * where EACH card keeps its OWN faction frame — the exact mixed, multi-faction
 * stream desktop renders, not seven per-faction screens. Presentation-only: it
 * reuses the shared `useUpdates()` fetch and the per-item FeedCardRouter (which
 * already wraps every row in the acting faction's frame via
 * `context_faction_slug`), touch-tuned for a 375px viewport.
 */

/** Full `feed` catalog key for each filter's chip label (spaces aren't keys). */
const FILTER_LABEL_KEY = {
  'All': 'mobile.filter.all',
  'Friends': 'mobile.filter.friends',
  'Foes': 'mobile.filter.foes',
  'Your Stuff': 'mobile.filter.yourStuff',
  'Global': 'mobile.filter.global',
  'Requests': 'mobile.filter.requests',
} as const satisfies Record<FeedFilter, string>

export default function MobileUpdates({ state }: { state: UpdatesState }) {
  const { t } = useTranslation('feed')
  const { t: tc } = useTranslation('common')
  const {
    items,
    counts,
    filter,
    setFilter,
    loading,
    loadingMore,
    nextCursor,
    fetchError,
    loadMoreError,
    loadMore,
  } = state

  return (
    <div className="py-4" data-feed="mobile" data-testid="mobile-updates">
      <p className="eyebrow mb-1">{t('mobile.eyebrow')}</p>
      <h1
        className="font-display italic font-medium mb-3"
        style={{ fontSize: 'var(--text-title)', color: 'var(--color-text-primary)', lineHeight: 1.1 }}
      >
        {t('mobile.title')}
      </h1>

      {/* Filter chips — one horizontal-scroll row of touch targets. */}
      <div
        className="flex gap-2 mb-4"
        style={{ overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}
      >
        {ALL_FILTERS.map((option) => {
          const active = filter === option
          const count = getCount(option, counts)
          const isRequests = option === 'Requests'
          const hasRedBadge = isRequests && count > 0
          return (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              style={{
                flex: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: "'Courier Prime', monospace",
                fontSize: 'var(--text-md)',
                fontWeight: active ? 700 : 400,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: active ? 'var(--color-text-on-accent)' : 'var(--color-text-secondary)',
                background: active ? 'var(--color-text-primary)' : 'var(--color-bg-surface)',
                border: `1px solid ${active ? 'transparent' : 'var(--color-border-strong)'}`,
                borderRadius: 999,
                padding: '9px 15px',
                minHeight: 38,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {t(FILTER_LABEL_KEY[option])}
              {count > 0 && (
                <span
                  style={{
                    background: hasRedBadge
                      ? 'var(--color-danger)'
                      : active
                        ? 'var(--color-bg-surface)'
                        : 'var(--color-bg-surface-alt)',
                    color: hasRedBadge ? 'var(--color-text-on-accent)' : 'var(--color-text-primary)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 999,
                    minWidth: 16,
                    textAlign: 'center',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Stream — single column; every card keeps its own faction frame. */}
      {loading ? (
        <p className="font-body text-muted">{t('page.loading')}</p>
      ) : fetchError ? (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {fetchError}{' '}
          <button onClick={() => window.location.reload()} className="underline">
            {tc('states.tryRefreshing')}
          </button>
        </p>
      ) : items.length === 0 ? (
        <div className="sidebar-card" style={{ padding: 20, textAlign: 'center' }}>
          <p className="font-body content-text" style={{ color: 'var(--color-text-tertiary)' }}>
            {t('page.empty')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {renderStream(items)}
        </div>
      )}

      {loadMoreError && !loading && !fetchError && (
        <p className="font-body text-sm text-red-600" style={{ textAlign: 'center', marginTop: 12 }}>
          {loadMoreError}
        </p>
      )}

      {nextCursor && !loading && !fetchError && (
        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              width: '100%',
              fontFamily: "'Courier Prime', monospace",
              fontSize: 'var(--text-lg)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: 'var(--color-bg-surface)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 0,
              minHeight: 48,
              cursor: loadingMore ? 'not-allowed' : 'pointer',
              padding: '12px 16px',
            }}
          >
            {loadingMore ? t('mobile.loadingMore') : t('mobile.loadMore')}
          </button>
        </div>
      )}
    </div>
  )
}

/** Single-column list with date dividers, one FeedCardRouter per item. */
function renderStream(items: UpdatesState['items']): React.ReactNode[] {
  const elements: React.ReactNode[] = []
  let lastDateLabel = ''

  for (let index = 0; index < items.length; index++) {
    const item = items[index]
    const dateLabel = getDateLabel(item.timestamp)

    if (dateLabel !== lastDateLabel) {
      elements.push(<FeedDateDivider key={`divider-${dateLabel}-${index}`} label={dateLabel} />)
      lastDateLabel = dateLabel
    }

    elements.push(<FeedCardRouter key={`${item.type}-${item.timestamp}-${index}`} item={item} />)
  }

  return elements
}
