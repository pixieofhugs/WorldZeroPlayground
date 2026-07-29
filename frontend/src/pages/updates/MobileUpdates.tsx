import { useTranslation } from 'react-i18next'
import FeedCardRouter from '../../components/feed/FeedCardRouter'
import FeedDateDivider, { getDateLabel } from '../../components/feed/FeedDateDivider'
import FeedEmptyState from '../../components/feed/FeedEmptyState'
import FeedBulkArchiveButton from '../../components/feed/FeedBulkArchiveButton'
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
 *
 * #1194 reaches the phone for free, exactly as that split intends: the Archived
 * tab is one more chip, and swipe-left-to-archive and the undo strip live in
 * `FeedItemSlot`, inside the shared `FeedCardRouter`. Nothing about the archive
 * is implemented twice.
 */

/** Full `feed` catalog key for each filter's chip label (spaces aren't keys). */
const FILTER_LABEL_KEY = {
  'All': 'mobile.filter.all',
  'Friends': 'mobile.filter.friends',
  'Foes': 'mobile.filter.foes',
  'Your Stuff': 'mobile.filter.yourStuff',
  'Global': 'mobile.filter.global',
  'Requests': 'mobile.filter.requests',
  'Archived': 'mobile.filter.archived',
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
    archivedView,
    refreshCounts,
    archiveAll,
    restoreAll,
    bulkPending,
    bulkError,
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
        style={{ overflowX: 'auto', paddingBottom: 'var(--space-xs)', scrollbarWidth: 'none' }}
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
                gap: 'var(--space-sm)',
                fontFamily: "'Courier Prime', monospace",
                fontSize: 'var(--text-md)',
                fontWeight: active ? 700 : 400,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: active ? 'var(--color-text-on-accent)' : 'var(--color-text-secondary)',
                background: active ? 'var(--color-text-primary)' : 'var(--color-bg-surface)',
                border: `1px solid ${active ? 'transparent' : 'var(--color-border-strong)'}`,
                borderRadius: 999,
                padding: 'var(--space-sm) var(--space-lg)',
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
                    padding: 'var(--space-xs) var(--space-sm)',
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

      {/* Bulk archive — only when there is something to act on. */}
      {items.length > 0 && !loading && !fetchError && (
        <div className="mb-3" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <FeedBulkArchiveButton
            archivedView={archivedView}
            onAct={archivedView ? restoreAll : archiveAll}
            pending={bulkPending}
          />
        </div>
      )}
      {bulkError && (
        <p className="font-body content-text mb-3" style={{ color: 'var(--color-danger)' }}>
          {bulkError}
        </p>
      )}

      {/* Stream — single column; every card keeps its own faction frame. */}
      {loading ? (
        <p className="font-body text-muted">{t('page.loading')}</p>
      ) : fetchError ? (
        <p className="font-body content-text text-red-600 border-2 border-red-300 px-3 py-2">
          {fetchError}{' '}
          <button onClick={() => window.location.reload()} className="underline">
            {tc('states.tryRefreshing')}
          </button>
        </p>
      ) : items.length === 0 ? (
        <FeedEmptyState archivedView={archivedView} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {renderStream(items, archivedView, refreshCounts)}
        </div>
      )}

      {loadMoreError && !loading && !fetchError && (
        <p className="font-body content-text text-red-600" style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
          {loadMoreError}
        </p>
      )}

      {nextCursor && !loading && !fetchError && (
        <div style={{ marginTop: 'var(--space-xl)' }}>
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
              padding: 'var(--space-md) var(--space-lg)',
            }}
          >
            {loadingMore ? t('mobile.loadingMore') : t('mobile.loadMore')}
          </button>
        </div>
      )}
    </div>
  )
}

/** Single-column list with date dividers, one FeedCardRouter per item. Keyed on
 *  `item_key` since #1194 so a slot mid-undo is never remounted. */
function renderStream(
  items: UpdatesState['items'],
  archivedView: boolean,
  onArchiveChange: () => void,
): React.ReactNode[] {
  const elements: React.ReactNode[] = []
  let lastDateLabel = ''

  for (const item of items) {
    const dateLabel = getDateLabel(item.timestamp)

    if (dateLabel !== lastDateLabel) {
      elements.push(<FeedDateDivider key={`divider-${dateLabel}-${item.item_key}`} label={dateLabel} />)
      lastDateLabel = dateLabel
    }

    elements.push(
      <FeedCardRouter
        key={item.item_key}
        item={item}
        archivedView={archivedView}
        onArchiveChange={onArchiveChange}
      />,
    )
  }

  return elements
}
