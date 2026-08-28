/**
 * The Requests queue's derivations — which obligation is on screen, what "Still
 * waiting" advances to, and which chips the tray offers (#1422, epic #1419
 * decisions 8/15/16/17).
 *
 * ADR-0070 makes this queue the ONLY live home for an unanswered obligation:
 * `_visible_types` drops the four request types out of the live `all` and
 * `your_stuff` streams, so nothing renders twice. The queue reads them back
 * with `?filter=requests`, which the backend still serves — the TAB is what
 * #1421 deleted, not the wire filter.
 *
 * Kept out of the component because the repo's harness is
 * `renderToStaticMarkup` only, with no DOM and no effects: a self-fetching
 * carousel cannot be driven from a test, so every rule that carries a guarantee
 * lives here where it can be asserted directly. Same posture as
 * `updatesFilters.ts` next door.
 *
 * ## The cursor is a KEY, not an index
 *
 * The list refetches under the queue — the bus fires on every accept, decline,
 * submit and archive anywhere in the app — so an integer cursor would silently
 * point at a different obligation after a refetch. Naming the item instead
 * makes "answering advances" fall out for free: the answered item is gone from
 * the next response, {@link selectQueueIndex} no longer finds the key, and the
 * queue lands on the newest thing still waiting. No resolved-set, no optimistic
 * removal, no second source of truth about what is outstanding.
 *
 * ## Skipping persists nothing (decision 17)
 *
 * "Still waiting" moves the cursor and writes nothing anywhere — no snooze
 * table, no column, not even a session set. A skipped obligation genuinely IS
 * still outstanding, so it stays in the tray, stays in the count, and comes
 * back round: {@link nextQueueKey} wraps. Reload returns to the first card,
 * which is the honest answer to "what is waiting on me".
 */
import type { ActivityFeedItem } from '../../api/activityFeed'

/** The wire filter the queue reads. Not a tab — #1421 deleted the tab. */
export const QUEUE_FILTER = 'requests'

/**
 * How many obligations the queue fetches. There is no "load older" here: a pile
 * you are meant to clear is not a river you scroll, and a player with more than
 * this many outstanding requests has a bigger problem than pagination.
 */
export const QUEUE_LIMIT = 50

/**
 * How many chips the tray draws before it collapses the rest behind `+N more`.
 *
 * Load-bearing on the phone rather than decoration: ten chips at 44px wrap into
 * a tray taller than the card it navigates, which buries the thing the player
 * came to answer.
 */
export const TRAY_CAP = 4

/**
 * The four types the queue accepts — exactly `FILTER_REQUESTS` after B1
 * (#1420), and exactly the set `REQUEST_ITEM_TYPES` derives on the backend.
 *
 * `comment_mention` is deliberately NOT here. The codebase ruled it before this
 * epic existed — "a mention is news about you, not a request of you"
 * (`normalizeFeedItem.ts`) — and its only action is "Reply", so not replying is
 * not an outstanding obligation.
 */
export const QUEUE_ITEM_TYPES: readonly string[] = [
  'awaiting_submission',
  'invitation_letter',
  'duel_challenge',
  'collab_invite',
]

/**
 * The trust boundary. `?filter=requests` returns these four and nothing else
 * today, but the queue's whole promise is "everything here is waiting on an
 * answer from you" — a fifth type joining `FILTER_REQUESTS` on the backend
 * would break that promise silently, with a card whose buttons answer nothing.
 * One `includes` is cheaper than finding that out from a player.
 */
export function isQueueItem(item: ActivityFeedItem): boolean {
  return QUEUE_ITEM_TYPES.includes(item.type)
}

/** The obligations in a feed response, in the feed's own order — newest first,
 *  as `get_activity_feed` already returns them. No second sort (decision 17). */
export function queueItems(items: readonly ActivityFeedItem[]): ActivityFeedItem[] {
  return items.filter(isQueueItem)
}

/**
 * Which card is on screen, or `-1` when the queue is empty.
 *
 * An unknown key falls back to the FIRST item rather than to nothing. That one
 * line is what makes answering advance, what makes a reload start at the top,
 * and what stops a refetch that drops the current item from blanking the queue.
 */
export function selectQueueIndex(
  items: readonly ActivityFeedItem[],
  activeKey: string | null,
): number {
  if (items.length === 0) return -1
  const index = items.findIndex((item) => item.item_key === activeKey)
  return index === -1 ? 0 : index
}

/** The key "Still waiting" moves to. Wraps, because skipping resolves nothing —
 *  the last card's next is the first, not the done state. */
export function nextQueueKey(
  items: readonly ActivityFeedItem[],
  activeKey: string | null,
): string | null {
  if (items.length === 0) return null
  const from = selectQueueIndex(items, activeKey)
  return items[(from + 1) % items.length].item_key
}

/** The other direction, for the tray's arrow keys. Wraps the same way. */
export function previousQueueKey(
  items: readonly ActivityFeedItem[],
  activeKey: string | null,
): string | null {
  if (items.length === 0) return null
  const from = selectQueueIndex(items, activeKey)
  return items[(from - 1 + items.length) % items.length].item_key
}

/**
 * "Nothing is waiting on you."
 *
 * Reached only by emptying the queue, never by skipping through it — which is
 * why this reads the list and not a cursor. The done state is a statement about
 * the world, and a player who has pressed "Still waiting" on everything has not
 * changed the world.
 */
export function isQueueDone(items: readonly ActivityFeedItem[]): boolean {
  return items.length === 0
}

interface QueueTray {
  /** The chips to draw, in feed order, never including the card on screen. */
  chips: ActivityFeedItem[]
  /** How many waiting obligations the cap is hiding — the `+N more` number. */
  hidden: number
  /** Whether the expander is offered at all. True while expanded, so the
   *  control that opened the tray can also close it. */
  expandable: boolean
}

/**
 * The chip tray — the queue's ONE navigator (decision 16).
 *
 * The design ships this AND a 10-segment dot bar doing the identical job. The
 * dots are cut: a 4px bar whose only affordance is a `title` tooltip is
 * invisible on touch and close to useless to a screen reader, while a chip
 * carries a faction sigil and a readable label.
 *
 * The card on screen is excluded rather than marked-as-current. A chip is a
 * "go there" control and the place you already are is not somewhere to go
 * (CLAUDE.md: hide unusable controls, never draw them disabled) — and on the
 * phone, dropping it is one less row of wrap.
 */
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
