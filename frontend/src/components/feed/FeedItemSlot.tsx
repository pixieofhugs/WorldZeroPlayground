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
import { feedDismissedMessage, feedItemTitle, isArchivable } from './feedItemLabels'

/**
 * One feed slot, owning the whole archive interaction (#1194, §2a) outside the
 * faction frames: the ✕/↺ control (handed down finished), touch swipe, the
 * write, and an in-slot undo strip that degrades to the plain reverse verb
 * after six seconds (the list never jumps).
 *
 * The write is IMMEDIATE, undo issues the reverse write: waiting out the window
 * would lose the dismissal whenever the player navigates away.
 *
 * Render prop because chassis cards take the control as
 * `FeedFrameProps.archive` while `era_announcement` places it in its own header
 * (epic #1192 decision 6). `archivedView` just swaps the direction's words.
 */

/** Swipe commits past this fraction of the width on release (§2a). */
const SWIPE_COMMIT_FRACTION = 0.4

type Phase = 'card' | 'acted'

export default function FeedItemSlot({
  item,
  archivedView = false,
  onArchiveChange,
  children,
}: {
  item: ActivityFeedItem
  /** Archived tab: act is restore, and the "still waiting" tag shows. */
  archivedView?: boolean
  /** Fired after any write. Must NOT drop the item: the undo strip stands in its slot. */
  onArchiveChange?: () => void
  /** Gets the archive control and the bare action (both `null` when none). The
   *  action lets a body reuse the write under its own label ("Not now", #1424). */
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

  // `awaiting_submission` is state, not an event: the backend refuses to archive
  // it, so no control. It can't be in the archive, so restore is always offered.
  const offersControl = archivedView || isArchivable(item)

  // On lapse the strip stays and offers the plain reverse verb.
  useEffect(() => {
    if (phase !== 'acted' || undoPhase === 'expired') return
    const timer = window.setTimeout(() => setUndoPhase('expired'), UNDO_WINDOW_MS)
    return () => window.clearTimeout(timer)
  }, [phase, undoPhase])

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
      // The card comes back: no undo strip for a dismissal that never happened.
      setError(
        extractError(
          err,
          i18n.t(archivedView ? 'feed:archive.restoreError' : 'feed:archive.error'),
        ),
      )
    }
    setBusy(false)
  }

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

  if (phase === 'acted') {
    return (
      <FeedUndoStrip
        // Per-type dismiss line where authored (#1458): "Not now" is a deferral,
        // not an archive decision.
        message={
          archivedView
            ? i18n.t('feed:archive.restored', { title: feedItemTitle(item) })
            : feedDismissedMessage(item)
        }
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

  // Touch only: on a mouse, drag would fight text selection and links; the ✕
  // covers pointer and keyboard.
  const canSwipe = offersControl && !busy

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canSwipe || event.pointerType !== 'touch') return
    dragStartX.current = event.clientX
    slotWidth.current = slotRef.current?.offsetWidth ?? 0
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return
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
    setDragX(0)
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
        // `pan-y` keeps vertical scroll.
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
