import { useEffect, useState, type KeyboardEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FeedCardRouter from '../../components/feed/FeedCardRouter'
import FactionSigil from '../../components/sigil/FactionSigil'
import { REQUESTS_QUEUE_ANCHOR } from './requestsQueueAnchor'
import { feedTypeLabel } from './updatesFilters'
import {
  nextQueueKey,
  previousQueueKey,
  selectQueueIndex,
  selectQueueTray,
} from './requestsQueueCursor'
import { useRequestsQueue } from './useRequestsQueue'

/** The sigil on a tray chip. Matches `factionFacet`'s chip-place size. */
const CHIP_SIGIL_SIZE = 14

const TITLE_ID = 'requests-queue-title'
const BODY_ID = 'requests-queue-body'

/**
 * The Requests queue: unanswered obligations, answered one at a time (#1422).
 * Under ADR-0070 it is their only live home.
 *
 * - A frame around `FeedCardRouter`, not a card set: faction skins already ship
 *   (#1192), so "Still waiting" lives in the footer, not in eight skins.
 * - One navigator: the chip tray; the design's dot bar is cut (useless on touch/SR).
 * - No "Archive all": archiving never answers anything (ADR-0070).
 * - Neutral chrome, no faction accent.
 */
export default function RequestsQueue() {
  const { t } = useTranslation('feed')
  const { t: tc } = useTranslation('common')
  const { items, loading, error, refresh } = useRequestsQueue()
  const { hash } = useLocation()

  /** A key, not an index: the list refetches on every answer anywhere. */
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [trayExpanded, setTrayExpanded] = useState(false)

  // Deep links (#1421) arrive as this fragment. Expand and scroll: React Router
  // doesn't resolve hashes. Re-runs on `hash` for links pressed on /updates.
  useEffect(() => {
    if (hash !== `#${REQUESTS_QUEUE_ANCHOR}`) return
    setCollapsed(false)
    document
      .getElementById(REQUESTS_QUEUE_ANCHOR)
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [hash])

  // A clear queue is one line (#2234): the full panel cost a phone most of its
  // first screen. The section stays as the bell's anchor target (#2083).
  // Silent while loading: "nothing waiting" before the fetch is a claim.
  if (!error && items.length === 0) {
    return (
      <section id={REQUESTS_QUEUE_ANCHOR} style={{ marginBottom: 'var(--space-lg)' }}>
        {!loading && <p className="label-caption">{t('queue.doneTitle')}</p>}
      </section>
    )
  }

  const index = selectQueueIndex(items, activeKey)
  const current = index === -1 ? null : items[index]
  const tray = selectQueueTray(items, activeKey, trayExpanded)
  const navigable = tray.chips.length > 0

  /** Live-region text: the card swaps on skip, chip and answer. */
  const announcement = current
    ? [feedTypeLabel(current.type), t('queue.remaining', { count: items.length })].join(
        ', ',
      )
    : t('queue.doneTitle')

  /** Arrow keys, scoped to the footer band so they don't fight the card's controls. */
  const onBandKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') setActiveKey(nextQueueKey(items, activeKey))
    else if (event.key === 'ArrowLeft') setActiveKey(previousQueueKey(items, activeKey))
    else return
    event.preventDefault()
  }

  return (
    <section
      id={REQUESTS_QUEUE_ANCHOR}
      className="requests-queue"
      aria-labelledby={TITLE_ID}
    >
      <div className="requests-queue__head">
        <div>
          <p className="label-heading">{t('queue.eyebrow')}</p>
          <h2 id={TITLE_ID} className="font-display requests-queue__title">
            {t('queue.title')}
          </h2>
        </div>
        <button
          type="button"
          className="requests-queue__toggle"
          onClick={() => setCollapsed((was) => !was)}
          aria-expanded={!collapsed}
          aria-controls={BODY_ID}
        >
          <span>{collapsed ? t('queue.expand') : t('queue.collapse')}</span>
          {/* Collapsed still shows the count. */}
          {items.length > 0 && (
            <span className="requests-queue__badge">
              {t('queue.remaining', { count: items.length })}
            </span>
          )}
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {/* `hidden`, not unmounted: `aria-controls` must resolve, and the card
          must keep its pending state. */}
      <div id={BODY_ID} hidden={collapsed}>
        <div className="requests-queue__body">
          {loading ? null : error ? (
            <p className="font-body content-text requests-queue__error">{error}</p>
          ) : (
            // Never null past the empty-list early return.
            current && <FeedCardRouter item={current} onArchiveChange={refresh} />
          )}
        </div>

        {/* Hidden when there is nowhere to go (STYLE §1.4). */}
        {navigable && !loading && !error && (
          <div className="requests-queue__foot" onKeyDown={onBandKeyDown}>
            <div
              className="requests-queue__tray"
              role="group"
              aria-label={t('queue.trayLabel')}
            >
              {tray.chips.map((chip) => (
                <button
                  key={chip.item_key}
                  type="button"
                  className="requests-queue__chip"
                  onClick={() => setActiveKey(chip.item_key)}
                >
                  <span className="requests-queue__chip-sigil">
                    <FactionSigil
                      slug={chip.context_faction_slug}
                      size={CHIP_SIGIL_SIZE}
                    />
                  </span>
                  {feedTypeLabel(chip.type)}
                </button>
              ))}
              {tray.expandable && (
                <button
                  type="button"
                  className="requests-queue__more"
                  onClick={() => setTrayExpanded((was) => !was)}
                  aria-expanded={trayExpanded}
                >
                  {trayExpanded
                    ? tc('actions.showFewer')
                    : tc('actions.showMore', { count: tray.hidden })}
                </button>
              )}
            </div>
            {/* Persists nothing: the obligation is still outstanding and comes
                back round. */}
            <button
              type="button"
              className="requests-queue__more"
              onClick={() => setActiveKey(nextQueueKey(items, activeKey))}
            >
              {t('queue.skip')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
