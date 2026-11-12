import { useTranslation } from 'react-i18next'
import PageTitle from '../components/ui/PageTitle'
import FeedCardRouter from '../components/feed/FeedCardRouter'
import FeedDateDivider, { getDateLabel } from '../components/feed/FeedDateDivider'
import FeedBulkArchiveButton from '../components/feed/FeedBulkArchiveButton'
import UpdatesFilterBar, { UpdatesListEmpty } from './updates/UpdatesFilterBar'
import RequestsQueue from './updates/RequestsQueue'
import { useUpdates, type UpdatesState } from './updates/useUpdates'

/**
 * The activity feed — ONE responsive page (#1421). A mixed, multi-faction
 * stream: every card keeps its own frame via `context_faction_slug`.
 */
export default function Updates() {
  const { t } = useTranslation('feed')
  const { t: tc } = useTranslation('common')
  const state = useUpdates()
  const {
    items,
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
    bulkArchiveAvailable,
  } = state

  return (
    <div className="py-8">
      <PageTitle title={t('page.title')} eyebrow={t('page.eyebrow')} />

      {/* Not subject to the filters: since ADR-0070 this is the only place an
          unanswered request is reachable. */}
      <RequestsQueue />

      <UpdatesFilterBar state={state} />

      {/* Only when its scope is exactly what is on screen. */}
      {items.length > 0 && !loading && !fetchError && bulkArchiveAvailable && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 'var(--space-md)',
          }}
        >
          <FeedBulkArchiveButton
            archivedView={archivedView}
            onAct={archivedView ? restoreAll : archiveAll}
            pending={bulkPending}
          />
        </div>
      )}
      {bulkError && (
        <p
          className="font-body content-text"
          style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-md)' }}
        >
          {bulkError}
        </p>
      )}

      {loading ? (
        <div className="py-8 font-body text-muted">{tc('loading')}</div>
      ) : fetchError ? (
        <p className="font-body content-text danger-text border-2 danger-edge px-3 py-2">
          {fetchError}{' '}
          <button onClick={() => window.location.reload()} className="underline">
            {tc('states.tryRefreshing')}
          </button>
        </p>
      ) : items.length === 0 ? (
        <UpdatesListEmpty state={state} />
      ) : (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
        >
          {renderStream(items, archivedView, refreshCounts)}
        </div>
      )}

      {loadMoreError && !loading && !fetchError && (
        <p
          className="font-body content-text danger-text"
          style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}
        >
          {loadMoreError}
        </p>
      )}

      {nextCursor && !loading && !fetchError && (
        <div style={{ marginTop: 'var(--space-xl)' }}>
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="feed-load-more"
          >
            {loadingMore ? tc('loading') : t('page.loadMore')}
          </button>
        </div>
      )}
    </div>
  )
}

/** Keyed on the stable `item_key` so an undo strip's window survives (#1194). */
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
      elements.push(
        <FeedDateDivider key={`divider-${dateLabel}-${item.item_key}`} label={dateLabel} />,
      )
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
