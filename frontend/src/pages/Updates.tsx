import { useTranslation } from 'react-i18next'
import PageTitle from '../components/ui/PageTitle'
import FeedCardRouter from '../components/feed/FeedCardRouter'
import FeedDateDivider, { getDateLabel } from '../components/feed/FeedDateDivider'
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
  } = state

  /** Insert date dividers between items when the date changes. */
  const renderFeedWithDividers = () => {
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
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.1em', padding: '5px 10px',
          cursor: 'pointer', transition: 'all 120ms',
          display: 'flex', alignItems: 'center', gap: 5,
        }}
      >
        {active && <span style={{ position: 'absolute', inset: 2, border: '1px dashed var(--stamp-active-dashed)', pointerEvents: 'none' }} />}
        {option}
        {count > 0 && (
          <span style={{
            background: hasRedBadge ? 'var(--color-danger)' : (active ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'),
            color: hasRedBadge ? 'var(--color-text-on-accent)' : 'inherit',
            fontSize: 8, padding: '0 5px', borderRadius: 8, minWidth: 16, textAlign: 'center',
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
      <div style={{ marginBottom: 20 }}>
        {/* Row 1 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <span className="eyebrow">{t('page.show')}</span>
          {ROW_1_FILTERS.map(renderFilterButton)}
        </div>
        {/* Row 2 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', paddingLeft: 36 }}>
          {ROW_2_FILTERS.map(renderFilterButton)}
        </div>
      </div>

      {/* ── Feed ── */}
      {loading ? (
        <div className="py-8 font-body text-muted">{t('page.loading')}</div>
      ) : fetchError ? (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {fetchError}{' '}
          <button onClick={() => window.location.reload()} className="underline">{tc('states.tryRefreshing')}</button>
        </p>
      ) : items.length === 0 ? (
        <div className="sidebar-card" style={{ padding: 20, textAlign: 'center' }}>
          <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
            {t('page.empty')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {renderFeedWithDividers()}
        </div>
      )}

      {/* ── Load More error (inline) ── */}
      {loadMoreError && !loading && !fetchError && (
        <p className="font-body text-sm text-red-600" style={{ textAlign: 'center', marginTop: 12 }}>
          {loadMoreError}
        </p>
      )}

      {/* ── Load More ── */}
      {nextCursor && !loading && !fetchError && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              fontFamily: "'Courier Prime', monospace",
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              background: 'transparent',
              color: '#c49a3a',
              border: 'none',
              cursor: loadingMore ? 'not-allowed' : 'pointer',
              padding: '8px 16px',
            }}
          >
            {loadingMore ? 'Loading...' : 'Load Older Updates →'}
          </button>
        </div>
      )}
    </div>
  )
}
