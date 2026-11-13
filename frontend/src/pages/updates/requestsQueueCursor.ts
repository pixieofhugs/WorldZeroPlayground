/**
 * The Requests queue's pure derivations (#1422), kept out of the no-DOM-testable
 * component. ADR-0070: the queue is the only live home for an unanswered
 * obligation, read via the `?filter=requests` wire filter.
 *
 * The cursor is a key, not an index: the list refetches on every answer
 * anywhere, and an answered item's key no longer resolving is what makes
 * answering advance. Skipping persists nothing; {@link nextQueueKey} wraps.
 */
import type { ActivityFeedItem } from '../../api/activityFeed'

export const QUEUE_FILTER = 'requests'

/** No "load older": a pile to clear, not a river to scroll. */
export const QUEUE_LIMIT = 50

/** Chips before `+N more`; more would wrap taller than the card on a phone. */
export const TRAY_CAP = 4

/**
 * Exactly `FILTER_REQUESTS` / `REQUEST_ITEM_TYPES` (#1420). `comment_mention`
 * is excluded: news about you, not a request of you (`normalizeFeedItem.ts`).
 */
export const QUEUE_ITEM_TYPES: readonly string[] = [
  'awaiting_submission',
  'invitation_letter',
  'duel_challenge',
  'collab_invite',
]

/** Trust boundary: a new backend request type must not silently join the queue. */
export function isQueueItem(item: ActivityFeedItem): boolean {
  return QUEUE_ITEM_TYPES.includes(item.type)
}

/** In the feed's own newest-first order; no second sort. */
export function queueItems(items: readonly ActivityFeedItem[]): ActivityFeedItem[] {
  return items.filter(isQueueItem)
}

/** Which card is on screen, `-1` if empty; an unknown key falls back to the first. */
export function selectQueueIndex(
  items: readonly ActivityFeedItem[],
  activeKey: string | null,
): number {
  if (items.length === 0) return -1
  const index = items.findIndex((item) => item.item_key === activeKey)
  return index === -1 ? 0 : index
}

/** The key "Still waiting" moves to; wraps, since skipping resolves nothing. */
export function nextQueueKey(
  items: readonly ActivityFeedItem[],
  activeKey: string | null,
): string | null {
  if (items.length === 0) return null
  const from = selectQueueIndex(items, activeKey)
  return items[(from + 1) % items.length].item_key
}

export function previousQueueKey(
  items: readonly ActivityFeedItem[],
  activeKey: string | null,
): string | null {
  if (items.length === 0) return null
  const from = selectQueueIndex(items, activeKey)
  return items[(from - 1 + items.length) % items.length].item_key
}

interface QueueTray {
  /** Feed order, never the card on screen. */
  chips: ActivityFeedItem[]
  /** The `+N more` number. */
  hidden: number
  /** True while expanded too, so the expander can close the tray. */
  expandable: boolean
}

/** The chip tray, the queue's one navigator; the on-screen card is excluded. */
export function selectQueueTray(
  items: readonly ActivityFeedItem[],
  activeKey: string | null,
  expanded: boolean,
  cap: number = TRAY_CAP,
): QueueTray {
  const active = selectQueueIndex(items, activeKey)
  const waiting = items.filter((_, index) => index !== active)
  const chips = expanded ? waiting : waiting.slice(0, cap)
  return {
    chips,
    hidden: waiting.length - chips.length,
    expandable: waiting.length > cap,
  }
}
