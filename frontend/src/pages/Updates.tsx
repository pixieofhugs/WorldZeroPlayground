import { useTranslation } from 'react-i18next'
import PageTitle from '../components/ui/PageTitle'
import FeedCardRouter from '../components/feed/FeedCardRouter'
import FeedDateDivider, { getDateLabel } from '../components/feed/FeedDateDivider'
import FeedBulkArchiveButton from '../components/feed/FeedBulkArchiveButton'
import UpdatesFilterBar, { UpdatesListEmpty } from './updates/UpdatesFilterBar'
import RequestsQueue from './updates/RequestsQueue'
import { useUpdates, type UpdatesState } from './updates/useUpdates'

/**
 * The activity feed — ONE responsive page (#1421).
 *
 * It used to dispatch on `useFormFactor()` into a desktop tab bar and a
 * `MobileUpdates` twin. The two already rendered the same children through the
 * same per-faction `FeedCardRouter` frames — `PageTitle`, `FeedDateDivider`,
 * `FeedEmptyState`, `FeedBulkArchiveButton` — and the only real divergence was
 * the filter chrome, which is exactly what `FilterBar` replaces: it is
 * responsive by design and has no mobile twin. Precedent for collapsing the
 * split is unanimous — ADR-0056, 0058, 0063, 0067, 0069, and kit-hygiene
 * #1312/#1319.
 *
 * Collapsing it also deleted a live i18n bug for free. The desktop half printed
 * its filter labels as raw English literals straight off the `FeedFilter`
 * union, untranslated, while the phone did it properly through the catalog;
 * there is now one set of labels and it is the localized one.
 *
 * The stream stays a MIXED, multi-faction river: every card keeps its OWN
 * faction frame via `context_faction_slug`, never one uniform tint.
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

      {/* Above the filters and above the stream, and NOT subject to either.
          ADR-0070 took the four request types out of the live feed, so this is
          the only place an unanswered obligation is reachable — including while
          the player is reading the archive, where the filter bar below applies
          to the stream and says nothing about what is owed. */}
      <RequestsQueue />

      <UpdatesFilterBar state={state} />

      {/* Bulk archive — only when it has something to act on, and only when its
          scope is exactly what is on screen. See `bulkArchiveAvailable`. */}
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

      {/* ── Feed ── */}
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

      {/* ── Load older ── */}
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

/**
 * Single-column list with date dividers, one `FeedCardRouter` per item.
 *
 * Keyed on `item_key` since #1194: it is stable for the life of the source row,
 * so a slot showing an undo strip is not remounted — and its six-second window
 * not restarted — by anything happening around it.
 */
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
