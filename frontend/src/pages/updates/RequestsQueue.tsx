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
 * The Requests queue — the actionable pile, promoted out of the chronological
 * stream and answered ONE AT A TIME (#1422, epic #1419).
 *
 * Under ADR-0070 this is the only live home for an unanswered obligation. The
 * four request types leave `All` and `Your Stuff` while unanswered, so nothing
 * renders twice and there is exactly one place where accept/decline lives.
 *
 * ## A container, not a card set (epic decision 15)
 *
 * The design hand-draws seven bespoke faction cards — Everymen's billboard
 * mast, Snide's acid-on-ink, Coven's script accent, Singularity's terminal
 * prompt, UA's rule — and EVERY ONE OF THEM ALREADY SHIPS. Epic #1192 put
 * `FactionFeedFrame` behind `context_faction_slug` with eight skins, gave it
 * the kicker·tag·time band, and kept `FeedCardCollabInvite` /
 * `FeedCardDuelChallenge` / `FeedCardInvitationLetter` as payload bodies with
 * their own handlers. So this file draws a frame around `FeedCardRouter` and
 * nothing else. Where the design's queue card differs from the shipped
 * chassis, the shipped chassis is correct — the same rule #1192 set for its
 * nine sheets.
 *
 * That is also why "Still waiting" sits in the footer band rather than in the
 * card's own action row where the design puts it: the container owns
 * navigation, and reaching into eight faction skins to add a ninth button would
 * be the exact duplication #1192 spent an epic removing.
 *
 * ## One navigator (decision 16)
 *
 * The design ships a 10-segment dot bar AND a labelled chip tray doing the
 * identical job. The dots are cut. A 4px bar whose only affordance is a `title`
 * tooltip is invisible on touch and close to useless to a screen reader; a chip
 * carries a faction sigil, a readable label and a 44px target.
 *
 * ## No "Archive all" here (decision 18)
 *
 * Deliberately absent, and not an oversight. Bulk-archiving your outstanding
 * obligations in one click is precisely what ADR-0070 forbids — archiving never
 * answers anything. The button stays scoped to the feed below.
 *
 * ## Chrome
 *
 * The design reaches for `var(--faction-snide-acid)` as the global accent. A
 * faction colour cannot be site chrome, so the queue uses the neutral
 * inverted-selection idiom `--color-text-primary` on `--color-bg-page` that
 * #1421 put on the filter bar's own badge, rather than inventing a third
 * treatment.
 */
export default function RequestsQueue() {
  const { t } = useTranslation('feed')
  const { t: tc } = useTranslation('common')
  const { items, loading, error, refresh } = useRequestsQueue()
  const { hash } = useLocation()

  /** Which obligation is on screen. A KEY, not an index — the list refetches
   *  under the queue on every answer anywhere in the app. */
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [trayExpanded, setTrayExpanded] = useState(false)

  // The nine deep links #1421 repointed — the sidebar's pending-request row and
  // all eight mobile field-desk archetypes — arrive as this fragment. Expand
  // AND scroll: React Router does not resolve a hash to an element, and a link
  // that lands you on a collapsed block has not taken you anywhere. Re-runs on
  // `hash` so pressing it while already on /updates still works.
  useEffect(() => {
    if (hash !== `#${REQUESTS_QUEUE_ANCHOR}`) return
    setCollapsed(false)
    document
      .getElementById(REQUESTS_QUEUE_ANCHOR)
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [hash])

  const index = selectQueueIndex(items, activeKey)
  const current = index === -1 ? null : items[index]
  const tray = selectQueueTray(items, activeKey, trayExpanded)
  const navigable = tray.chips.length > 0

  /**
   * The live region's text. The visible card SWAPS under the player — on skip,
   * on a chip, and on their own answer — so a screen reader that only ever
   * announced the button they pressed would leave them looking at something
   * they were never told about.
   */
  const announcement = current
    ? [feedTypeLabel(current.type), t('queue.remaining', { count: items.length })].join(
        ', ',
      )
    : t('queue.doneTitle')

  /** Arrow keys across the footer band, the carousel's keyboard axis. Scoped to
   *  the band so it never competes with the card's own controls. */
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
          {/* Collapsed still shows the count — the whole point of collapsing a
              queue is to put it away without forgetting it is there. */}
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

      {/* `hidden` rather than unmounted: `aria-controls` above must resolve to a
          real element in both states, and collapsing then reopening the queue
          should not remount the card and restart its own pending state. */}
      <div id={BODY_ID} hidden={collapsed}>
        <div className="requests-queue__body">
          {loading ? null : error ? (
            <p className="font-body content-text requests-queue__error">{error}</p>
          ) : current ? (
            <FeedCardRouter item={current} onArchiveChange={refresh} />
          ) : (
            <div className="requests-queue__done">
              <p className="font-display content-text">{t('queue.doneTitle')}</p>
              {/* #1421 authored this line already fixed: the design says
                  "No invitations, duels, mentions or submissions owed" and
                  a mention is not an obligation (decision 8). */}
              <p className="label-caption">{t('queue.doneBody')}</p>
            </div>
          )}
        </div>

        {/* Hidden outright when there is nowhere to go: a tray with no chips
            and a skip that skips to the same card are controls that cannot
            work (STYLE §1.4). */}
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
            {/* Persists nothing (decision 17). It moves the cursor and writes
                no snooze row anywhere, because the obligation really is still
                outstanding — so the card stays in the tray, stays in the
                count, and comes back round. */}
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
