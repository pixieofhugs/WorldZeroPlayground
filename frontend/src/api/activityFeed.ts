import { apiGet, apiPost } from './client'
import type { components } from './generated/schema'
import { notifyRequestsChanged } from '../utils/requestsBus'

/**
 * NOT an alias of the generated schema, and deliberately (#1400).
 *
 * The schema's feed item is a fifteen-arm discriminated union, one model per
 * feed type, each with its own typed payload. This is one flat shape with
 * `payload: Record<string, any>` — every consumer narrows the payload by hand.
 * Adopting the union is a real migration of those consumers, which is issue
 * #1402's subject; renaming the type without it would only move the `any`.
 */
export interface ActivityFeedItem {
  type: string
  /**
   * Stable identity for the archive (#1193): `"{type}:{source row PK}"`, e.g.
   * `collab_invite:42`. A feed item is a UNION over 15 source tables and owns no
   * row of its own, so this is the ONLY handle the archive can name.
   *
   * The type prefix is load-bearing, not decoration: three types are built from
   * the same `praxis_member` row and two from the same `praxis` row, so a bare
   * PK would collide and archiving one card would silently archive another.
   */
  item_key: string
  timestamp: string
  /**
   * The actor triple: always sent, `null` at worst.
   *
   * These read `?:` for one release, and the reason is the defect this slice
   * closes. `FeedItemBase` declares all three `Optional[str] = None`, and
   * FastAPI derived the OpenAPI `required` list from Pydantic defaults — so the
   * schema said "may be absent" about keys a live response has always
   * serialised. This interface was then widened to match the SCHEMA rather than
   * the wire, which is the wrong direction: a client claiming less than the
   * contract promises makes every reader carry a case that cannot happen, and
   * it left five dead `?? null` reads behind it.
   *
   * `WireModel` (`backend/schemas/base.py`) fixed the schema instead, so the
   * contract and the wire now agree and these can simply say what is true.
   */
  actor_display_name: string | null
  actor_faction_slug: string | null
  actor_avatar_url: string | null
  payload: Record<string, any>
  /** Faction this card's frame themes to (surface #12): actor's faction, else
   *  the task's faction, else null (neutral). Derived server-side. */
  context_faction_slug: string | null
}

/**
 * `by_type` is the type facet's counts (#1420, epic #1419 decision 4) — one
 * entry per feed type the CURRENT view could show, zeros included.
 *
 * It answers a different question from the six scalars beside it. Those are the
 * sidebar's "what is waiting for you" numbers and always describe the LIVE
 * feed, even while the archive is on screen; `by_type` describes the list the
 * caller is actually looking at, so on Archived it counts the archive.
 *
 * Computed under every active axis EXCEPT its own (decision 19), so ticking one
 * type never zeroes the rest and strands the player with no way back. The zero
 * rows are the client's to hide (decision 20) — they arrive so the facet can
 * tell "this view has no nudges" from "this view cannot have any".
 */
export type FeedCounts = components['schemas']['FeedCounts']

export interface ActivityFeedResponse {
  items: ActivityFeedItem[]
  counts: FeedCounts
  next_cursor: string | null
}

/** What every field of `FeedCounts` means when the server did not send it. */
const ABSENT_COUNTS: FeedCounts = {
  all: 0,
  friends: 0,
  foes: 0,
  your_stuff: 0,
  global_count: 0,
  requests: 0,
  by_type: {},
}

/**
 * Make the wire shape match what `FeedCounts` promises, because the server does
 * not always keep that promise.
 *
 * `by_type` arrived with #1420. A frontend built after it, talking to a backend
 * from before it, gets a `counts` object without the field — and a `uvicorn`
 * that was not restarted is enough to be in that state. `typeFacetOptions` then
 * spreads `Object.keys(by_type)` to build its row list, `Object.keys` throws on
 * `undefined`, and the throw happens during render, so React unmounts the tree:
 * the whole page goes white rather than one widget breaking.
 *
 * `useUpdates` seeds its state with defaults and then replaces the object
 * wholesale on load, so the safe value only ever covers the loading frame. That
 * is exactly how it was reported: fine while the updates load, blank when they
 * arrive.
 *
 * Normalising here rather than at the crash site keeps `FeedCounts` honest for
 * every consumer, including ones not written yet — a guard inside
 * `typeFacetOptions` would fix this page and leave the next reader of
 * `by_type` to rediscover it.
 *
 * A missing count degrades to zero. A wrong number is worth far less than a
 * lost page, and the zero is visible: the badge reads 0 instead of the app
 * disappearing.
 */
export function normalizeFeedCounts(raw: Partial<FeedCounts> | undefined | null): FeedCounts {
  return { ...ABSENT_COUNTS, ...(raw ?? {}) }
}

/**
 * The feed types the `requests` filter carries — the four the bell's
 * `pending_requests_count` is a COUNT of (ADR-0070).
 *
 * Here so the archive writes below can tell "this moved the bell's number" from
 * "this moved a card in the stream", which is the whole of #2220's gate. It
 * duplicates the server's `REQUEST_ITEM_TYPES` across a language boundary, so
 * it is pinned rather than commented: `__tests__/requestItemTypes.test.ts`
 * reads `FEED_SOURCES` and fails if a fifth type joins the filter or one leaves.
 *
 * `awaiting_submission` is in the set even though it can never be archived (it
 * is state, not an event — the backend refuses it). The set answers "does this
 * type feed the bell?", and it does; the archivability rule is a separate one
 * and lives in `components/feed/feedItemLabels`.
 */
export const REQUEST_ITEM_TYPES: ReadonlySet<string> = new Set([
  'collab_invite',
  'duel_challenge',
  'invitation_letter',
  'awaiting_submission',
])

/**
 * Did this write move the bell's number, and must the requests bus therefore
 * hear about it (#2220)?
 *
 * The type prefix of the item key is the only thing an archive call knows about
 * what it just moved — the response says `archived`/`changed`, never `type`.
 * That is enough: the key's prefix IS the feed type (see `item_key` above).
 *
 * A key so malformed it has no prefix reads as "not a request", which is the
 * safe direction — the server is about to 400 it anyway, so the alternative is
 * a bus event for a write that never happened.
 */
function movesThePendingCount(itemKey: string): boolean {
  return REQUEST_ITEM_TYPES.has(itemKey.slice(0, itemKey.indexOf(':')))
}

/** Result of archiving/restoring one item. `archived` is the state AFTER the
 *  call (both endpoints are idempotent); `changed` says whether a row moved. */
type FeedItemArchiveResult = components['schemas']['FeedItemArchiveResponse']

/** Result of a bulk archive/restore — how many items moved. */
type FeedBulkArchiveResult = components['schemas']['FeedBulkArchiveResponse']

export async function getActivityFeed(params?: {
  filter?: string
  before?: string
  limit?: number
  /** Read the archive instead of the live feed. Crossed WITH `filter`, never a
   *  member of it: archived-ness is state, the filter is a type-set. */
  archived?: boolean
  /**
   * The type facet's selection (#1420) — repeated `?types=`, INTERSECTED with
   * `filter`'s own set. Values the registry does not know are ignored server
   * side and an empty selection means "no type constraint", so a stale
   * bookmark degrades instead of 4xx-ing or matching nothing.
   *
   * REPEATED BARE keys — `types=nudge&types=global_task`, never `types[]=`,
   * which FastAPI reads nothing from while still answering 200 with an
   * unfiltered list. This module carried a `paramsSerializer` to force that out
   * of axios; `./client` gets it right by default, and
   * `__tests__/feedQueryParams.test.ts` pins the URL it actually builds rather
   * than trusting the library's default (#1400).
   */
  types?: string[]
}): Promise<ActivityFeedResponse> {
  const { data } = await apiGet('/activity-feed', { params: { query: params } })
  // The one place a `FeedCounts` enters the app, so the one place it has to be
  // made true. See `normalizeFeedCounts` — that one guards against an OLDER
  // BACKEND, which is a deployment fact no schema change can retire.
  //
  // `next_cursor` used to be collapsed with `?? null` here because the schema
  // called it optional. It is `string | null` and required now (#1400), so the
  // coalesce was reading a case the wire cannot send.
  return { ...data, counts: normalizeFeedCounts(data?.counts) }
}

/**
 * Put one feed item in the archive. 400 when the key is unknown, malformed, or
 * names an `awaiting_submission` row — that type is state, not an event, and the
 * backend refuses it. The UI must therefore not offer the control on that card
 * at all (hide unusable controls; never render them disabled).
 *
 * Archiving a REQUEST takes it out of `pending_requests_count`, so the bus has
 * to hear about it — see {@link movesThePendingCount}.
 */
export async function dismissFeedItem(itemKey: string): Promise<FeedItemArchiveResult> {
  const { data } = await apiPost('/activity-feed/dismiss', { body: { item_key: itemKey } })
  if (movesThePendingCount(itemKey)) notifyRequestsChanged()
  return data
}

/** Take one feed item back out of the archive. Restoring a request puts it back
 *  INTO the count, which is the same event from the other direction. */
export async function restoreFeedItem(itemKey: string): Promise<FeedItemArchiveResult> {
  const { data } = await apiPost('/activity-feed/restore', { body: { item_key: itemKey } })
  if (movesThePendingCount(itemKey)) notifyRequestsChanged()
  return data
}

/**
 * Archive everything the given filter currently returns. One call — the server
 * re-runs the feed for that filter, so the scope can never drift from what the
 * tab shows. `awaiting_submission` rows are SKIPPED, not refused.
 *
 * Fires the bus unconditionally, unlike the single-item writes: the SERVER
 * picks what this touched, so the client holds no key to test. Today a stream
 * filter cannot reach a request (ADR-0070 drops the four types out of `all` and
 * `your_stuff`), which makes the event redundant — but that is an invariant in
 * another language, and one refetch of a number the player just moved is
 * cheaper than the phantom badge the wrong guess would leave (#2220).
 */
export async function dismissAllFeedItems(filter?: string): Promise<FeedBulkArchiveResult> {
  const { data } = await apiPost('/activity-feed/dismiss-all', { body: { filter: filter ?? null } })
  notifyRequestsChanged()
  return data
}

/** Empty the archive (no filter = everything, which is what "Restore all" means
 *  on the Archived tab — the archived view has no tabs of its own). "Everything"
 *  includes archived requests, so this really can raise the bell's number. */
export async function restoreAllFeedItems(filter?: string): Promise<FeedBulkArchiveResult> {
  const { data } = await apiPost('/activity-feed/restore-all', { body: { filter: filter ?? null } })
  notifyRequestsChanged()
  return data
}
