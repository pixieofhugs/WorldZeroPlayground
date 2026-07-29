import { useTranslation } from 'react-i18next'
import PageTitle from '../components/ui/PageTitle'
import FeedCardRouter from '../components/feed/FeedCardRouter'
import FeedDateDivider, { getDateLabel } from '../components/feed/FeedDateDivider'
import FeedEmptyState from '../components/feed/FeedEmptyState'
import FeedBulkArchiveButton from '../components/feed/FeedBulkArchiveButton'
import { useFormFactor } from '../hooks/useFormFactor'
import {
  useUpdates,
  getCount,
  ROW_1_FILTERS,
  ROW_2_FILTERS,
  type FeedFilter,
  type UpdatesState,
} from './updates/useUpdates'
import MobileUpdates from './updates/MobileUpdates'

/**
 * Activity feed. `useUpdates()` owns the filter-tab fetch + cursor pagination;
 * on a phone (#532) `useFormFactor() === 'mobile'` swaps the desktop tab bar for
 * a scroll-native single-column stream. Both surfaces render the SAME items
 * through the SAME per-faction FeedCardRouter frames — a mixed, multi-faction
 * stream, presentation-only. Desktop renders exactly as before.
 */
export default function Updates() {
  const formFactor = useFormFactor()
  const state = useUpdates()

  if (formFactor === 'mobile') return <MobileUpdates state={state} />

  return <DesktopUpdates state={state} />
}

function DesktopUpdates({ state }: { state: UpdatesState }) {
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

  /** Insert date dividers between items when the date changes. */
  const renderFeedWithDividers = () => {
    const elements: React.ReactNode[] = []
    let lastDateLabel = ''

    for (const item of items) {
      const dateLabel = getDateLabel(item.timestamp)

      if (dateLabel !== lastDateLabel) {
        elements.push(<FeedDateDivider key={`divider-${dateLabel}-${item.item_key}`} label={dateLabel} />)
        lastDateLabel = dateLabel
      }

      // Keyed on `item_key` since #1194: it is stable for the life of the source
      // row, so a slot showing an undo strip is not remounted (and its six-second
      // window not restarted) by anything happening around it.
      elements.push(
        <FeedCardRouter
          key={item.item_key}
          item={item}
          archivedView={archivedView}
          onArchiveChange={refreshCounts}
        />,
      )
    }

    return elements
  }

  const renderFilterButton = (option: FeedFilter) => {
    const active = filter === option
    const count = getCount(option, counts)
    const isRequests = option === 'Requests'
    const hasRedBadge = isRequests && count > 0

    return (
      <button
        key={option}
        onClick={() => setFilter(option)}
        style={{
          position: 'relative',
          border: `2px solid ${active ? 'var(--color-text-primary)' : 'var(--color-border-strong)'}`,
          borderRadius: 0,
          background: active ? 'var(--color-text-primary)' : 'var(--color-bg-surface)',
          color: active ? 'var(--color-bg-page)' : 'var(--color-text-primary)',
          fontFamily: "'Courier Prime', monospace",
          fontSize: 'var(--text-base)', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.1em', padding: 'var(--space-xs) var(--space-md)',
          cursor: 'pointer', transition: 'all 120ms',
          display: 'flex', alignItems: 'center', gap: 'var(--space-xs)',
        }}
      >
        {active && <span style={{ position: 'absolute', inset: 2, border: '1px dashed var(--stamp-active-dashed)', pointerEvents: 'none' }} />}
        {option}
        {count > 0 && (
          <span style={{
            background: hasRedBadge ? 'var(--color-danger)' : (active ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'),
            color: hasRedBadge ? 'var(--color-text-on-accent)' : 'inherit',
            fontSize: 'var(--text-xs)', padding: '0 var(--space-xs)', borderRadius: 8, minWidth: 16, textAlign: 'center',
          }}>
            {count}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="py-8">
      <PageTitle title="Updates" eyebrow="Activity Feed" />

      {/* ── Filter Tabs ── */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Row 1 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)', alignItems: 'center' }}>
          <span className="eyebrow">{t('page.show')}</span>
          {ROW_1_FILTERS.map(renderFilterButton)}
        </div>
        {/* Row 2 — Global · Requests · Archived (#1194) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', alignItems: 'center', paddingLeft: 'var(--space-3xl)' }}>
          {ROW_2_FILTERS.map(renderFilterButton)}
          {/* Bulk archive lives with the tabs, and only when it has something to
              act on — hide an unusable control, never draw it disabled. */}
          {items.length > 0 && !loading && !fetchError && (
            <span style={{ marginLeft: 'auto' }}>
              <FeedBulkArchiveButton
                archivedView={archivedView}
                onAct={archivedView ? restoreAll : archiveAll}
                pending={bulkPending}
              />
            </span>
          )}
        </div>
        {bulkError && (
          <p className="font-body content-text" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-sm)' }}>
            {bulkError}
          </p>
        )}
      </div>

      {/* ── Feed ── */}
      {loading ? (
        <div className="py-8 font-body text-muted">{t('page.loading')}</div>
      ) : fetchError ? (
        <p className="font-body content-text text-red-600 border-2 border-red-300 px-3 py-2">
          {fetchError}{' '}
          <button onClick={() => window.location.reload()} className="underline">{tc('states.tryRefreshing')}</button>
        </p>
      ) : items.length === 0 ? (
        <FeedEmptyState archivedView={archivedView} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {renderFeedWithDividers()}
        </div>
      )}

      {/* ── Load More error (inline) ── */}
      {loadMoreError && !loading && !fetchError && (
        <p className="font-body content-text text-red-600" style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
          {loadMoreError}
        </p>
      )}

      {/* ── Load More ── */}
      {nextCursor && !loading && !fetchError && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)' }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              fontFamily: "'Courier Prime', monospace",
              fontSize: 'var(--text-base)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              background: 'transparent',
              color: '#c49a3a',
              border: 'none',
              cursor: loadingMore ? 'not-allowed' : 'pointer',
              padding: 'var(--space-sm) var(--space-lg)',
            }}
          >
            {loadingMore ? 'Loading...' : 'Load Older Updates →'}
          </button>
        </div>
      )}
    </div>
  )
}
