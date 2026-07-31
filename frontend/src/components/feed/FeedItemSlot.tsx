import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  dismissFeedItem,
  restoreFeedItem,
  type ActivityFeedItem,
} from '../../api/activityFeed'
import i18n from '../../i18n'
import { extractError } from '../../utils/errors'
import FeedArchiveButton from './FeedArchiveButton'
import FeedUndoStrip, { UNDO_WINDOW_MS, type FeedUndoPhase } from './FeedUndoStrip'
import { feedItemTitle, isArchivable } from './feedItemLabels'

/**
 * ONE SLOT IN THE FEED — and the whole of the archive interaction (#1194,
 * Unaffiliated sheet §2a).
 *
 * Everything about dismissing lives here, OUTSIDE the faction frames, so eight
 * skins inherit it and none of them reimplements it:
 *
 *  - the ✕ / ↺ control, handed to the card as a finished node;
 *  - swipe-left-to-archive on touch;
 *  - the write, issued IMMEDIATELY;
 *  - the undo strip, which replaces the card in THIS slot rather than floating
 *    somewhere else, so the list never jumps;
 *  - the six-second window, after which the strip degrades to the plain reverse
 *    verb instead of collapsing.
 *
 * WHY THE WRITE IS IMMEDIATE. The obvious implementation waits out the six
 * seconds and only then calls the server. That loses the dismissal the moment
 * the player navigates away, which is most of the time — you archive something
 * and keep reading, or leave. So the dismissal is written on the tap and undo
 * issues the reverse write. The strip offers a reversal; it does not delay an
 * action.
 *
 * WHY IT IS A RENDER PROP. The archive control has to sit wherever the card puts
 * its chrome, and the two kinds of card put it in different places: a chassis
 * card takes it as `FeedFrameProps.archive` on the band, while `era_announcement`
 * keeps its own neutral chrome deliberately (epic #1192 decision 6) and just
 * needs the ✕ dropped into its header. Handing the finished node to a callback
 * serves both without this component knowing which it is looking at.
 *
 * BOTH DIRECTIONS RUN THROUGH ONE PATH. In the feed the act is dismiss and the
 * reverse is restore; in the Archived tab it is the other way round. Only the
 * vocabulary differs, so `archivedView` picks the words and the same state
 * machine does the rest.
 */

/** A swipe commits past this fraction of the card's width on release; a shorter
 *  drag springs back (design §2a). */
const SWIPE_COMMIT_FRACTION = 0.4

type Phase = 'card' | 'acted'

export default function FeedItemSlot({
  item,
  archivedView = false,
  onArchiveChange,
  children,
}: {
  item: ActivityFeedItem
  /** True when this slot is being drawn in the Archived tab. Flips the act from
   *  dismiss to restore, and turns on the "still waiting" tag. */
  archivedView?: boolean
  /** Fired after any successful write, so the surrounding feed can refresh its
   *  counts. It must NOT drop the item from the list: that would delete the slot
   *  the undo strip is standing in. */
  onArchiveChange?: () => void
  /** Draws the card, given the finished archive control (or `null` when this
   *  item offers none) and the bare action behind it (likewise `null`).
   *
   *  The second argument is for a body that needs the SAME write under its own
   *  label — the invitation letter's "Not now" (#1424). It is deliberately the
   *  action and not a second button: dismissing lives here, once, so the undo
   *  strip still stands in this slot and no card reimplements the write. */
  children: (archive: ReactNode, act: (() => void) | null) => ReactNode
}) {
  const [phase, setPhase] = useState<Phase>('card')
  const [undoPhase, setUndoPhase] = useState<FeedUndoPhase>('undo')
  const [error, setError] = useState<string | null>(null)
  const [stripError, setStripError] = useState<string | null>(null)
  const [dragX, setDragX] = useState(0)
  const [busy, setBusy] = useState(false)
  const slotRef = useRef<HTMLDivElement | null>(null)
  const dragStartX = useRef<number | null>(null)
  const slotWidth = useRef(0)

  // `awaiting_submission` offers no control at all — the backend refuses to
  // archive it (it is state, not an event) and a control that can only fail must
  // not be drawn, not even disabled. Nothing in the archive can be that type, so
  // the archived view always offers its restore control.
  const offersControl = archivedView || isArchivable(item)

  // The six-second window. When it lapses the strip stays put and its action
  // becomes the plain reverse verb, so a reader who looked away still finds the
  // slot where they left it.
  useEffect(() => {
    if (phase !== 'acted' || undoPhase === 'expired') return
    const timer = window.setTimeout(() => setUndoPhase('expired'), UNDO_WINDOW_MS)
    return () => window.clearTimeout(timer)
  }, [phase, undoPhase])

  /** Archive (feed) or restore (archive) — written straight away. */
  const act = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    setDragX(0)
    try {
      if (archivedView) await restoreFeedItem(item.item_key)
      else await dismissFeedItem(item.item_key)
      setPhase('acted')
      setUndoPhase('undo')
      setStripError(null)
      onArchiveChange?.()
    } catch (err) {
      // The card comes back. A slot showing an undo strip for a dismissal that
      // never happened would be a lie about durable state.
      setError(
        extractError(
          err,
          i18n.t(archivedView ? 'feed:archive.restoreError' : 'feed:archive.error'),
        ),
      )
    }
    setBusy(false)
  }

  /** The reverse write — `Undo` inside the window, the plain verb after it. */
  const reverse = async () => {
    if (busy) return
    setBusy(true)
    setStripError(null)
    try {
      if (archivedView) await dismissFeedItem(item.item_key)
      else await restoreFeedItem(item.item_key)
      setPhase('card')
      onArchiveChange?.()
    } catch (err) {
      setStripError(
        extractError(
          err,
          i18n.t(archivedView ? 'feed:archive.error' : 'feed:archive.restoreError'),
        ),
      )
    }
    setBusy(false)
  }

  // ─── The undo strip, standing in this slot ────────────────────────────────
  if (phase === 'acted') {
    const title = feedItemTitle(item)
    return (
      <FeedUndoStrip
        message={i18n.t(
          archivedView ? 'feed:archive.restored' : 'feed:archive.archived',
          { title },
        )}
        actionLabel={i18n.t(
          undoPhase === 'undo'
            ? 'feed:archive.undo'
            : archivedView
              ? 'feed:archive.dismiss'
              : 'feed:archive.restore',
        )}
        phase={undoPhase}
        onAct={reverse}
        error={stripError}
      />
    )
  }

  // ─── Swipe-left to archive ────────────────────────────────────────────────
  //
  // Touch only. A mouse gets the ✕, which is both the pointer route and the
  // keyboard/screen-reader one; turning drag on for a mouse would fight text
  // selection and the links inside every card. Swipe is never the ONLY route to
  // the archive — that is the whole reason `FeedArchiveButton` exists.
  const canSwipe = offersControl && !busy

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canSwipe || event.pointerType !== 'touch') return
    dragStartX.current = event.clientX
    slotWidth.current = slotRef.current?.offsetWidth ?? 0
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return
    // Left only: a rightward drag is not a gesture this surface has.
    setDragX(Math.min(0, event.clientX - dragStartX.current))
  }

  const endDrag = () => {
    if (dragStartX.current === null) return
    const travelled = -dragX
    dragStartX.current = null
    if (slotWidth.current > 0 && travelled >= slotWidth.current * SWIPE_COMMIT_FRACTION) {
      void act()
      return
    }
    setDragX(0) // spring back
  }

  return (
    <div
      ref={slotRef}
      data-feed-slot={item.item_key}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        // `pan-y` so the gesture can be claimed horizontally without stealing
        // the vertical scroll the feed is read with.
        touchAction: canSwipe ? 'pan-y' : undefined,
        transform: dragX ? `translateX(${dragX}px)` : undefined,
        transition: dragX ? undefined : 'transform 160ms',
      }}
    >
      {error && (
        <p
          className="font-body"
          style={{
            margin: 0,
            fontSize: 'var(--text-content)',
            color: 'var(--color-danger)',
            padding: 'var(--space-xs) var(--space-lg)',
          }}
        >
          {error}
        </p>
      )}
      {children(
        offersControl ? (
          <FeedArchiveButton onAct={act} variant={archivedView ? 'restore' : 'archive'} />
        ) : null,
        offersControl ? act : null,
      )}
    </div>
  )
}
