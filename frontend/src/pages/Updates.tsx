import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getActivityFeed, type ActivityFeedItem, type FeedCounts } from '../api/activityFeed'
import PageTitle from '../components/ui/PageTitle'
import FeedCardRouter from '../components/feed/FeedCardRouter'
import FeedDateDivider, { getDateLabel } from '../components/feed/FeedDateDivider'
import { extractError } from '../utils/errors'

type FeedFilter = 'All' | 'Friends' | 'Foes' | 'Your Stuff' | 'Global' | 'Requests'

const ROW_1_FILTERS: FeedFilter[] = ['All', 'Friends', 'Foes', 'Your Stuff']
const ROW_2_FILTERS: FeedFilter[] = ['Global', 'Requests']

/** Map UI filter name to API filter param. */
const FILTER_API_MAP: Record<FeedFilter, string> = {
  'All': 'all',
  'Friends': 'friends',
  'Foes': 'foes',
  'Your Stuff': 'your_stuff',
  'Global': 'global',
  'Requests': 'requests',
}

/** Map filter name to the key in FeedCounts. */
function getCount(filter: FeedFilter, counts: FeedCounts): number {
  switch (filter) {
    case 'All': return counts.all
    case 'Friends': return counts.friends
    case 'Foes': return counts.foes
    case 'Your Stuff': return counts.your_stuff
    case 'Global': return counts.global_count
    case 'Requests': return counts.requests
  }
}

export default function Updates() {
  const { t } = useTranslation('feed')
  const { t: tc } = useTranslation('common')
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState<ActivityFeedItem[]>([])
  const [counts, setCounts] = useState<FeedCounts>({ all: 0, friends: 0, foes: 0, your_stuff: 0, global_count: 0, requests: 0 })
  // Deep-link the initial tab from ?filter=<api value> (e.g. Sidebar → Requests).
  const [filter, setFilter] = useState<FeedFilter>(() => {
    const apiFilter = searchParams.get('filter')
    return (Object.keys(FILTER_API_MAP) as FeedFilter[]).find(
      (name) => FILTER_API_MAP[name] === apiFilter,
    ) ?? 'All'
  })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)

  const fetchFeed = useCallback(async (feedFilter: FeedFilter, cursor?: string) => {
    const response = await getActivityFeed({
      filter: FILTER_API_MAP[feedFilter],
      before: cursor,
      limit: 20,
    })
    return response
  }, [])

  // Initial load + filter changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFetchError(null)
    setLoadMoreError(null)
    fetchFeed(filter).then((response) => {
      if (cancelled) return
      setItems(response.items)
      setCounts(response.counts)
      setNextCursor(response.next_cursor)
      setLoading(false)
    }).catch((err) => {
      if (cancelled) return
      setFetchError(extractError(err, "Couldn't load the activity feed."))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [filter, fetchFeed])

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      const response = await fetchFeed(filter, nextCursor)
      setItems((prev) => [...prev, ...response.items])
      setNextCursor(response.next_cursor)
    } catch (err) {
      setLoadMoreError(extractError(err, "Couldn't load more updates."))
    }
    setLoadingMore(false)
  }

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
            {loadingMore ? 'Loading...' : 'Load Older Updates \u2192'}
          </button>
        </div>
      )}
    </div>
  )
}
