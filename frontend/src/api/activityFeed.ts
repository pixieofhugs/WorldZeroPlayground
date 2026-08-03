import { apiGet, apiPost } from './client'

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
   * The actor triple, OPTIONAL as of #1400 — the generated schema says so.
   *
   * `FeedItemBase` declares all three `Optional[str] = None`, which makes them
   * non-required in the OpenAPI document; this interface used to declare them
   * required-and-nullable, and the migration to the typed transport is what
   * surfaced the disagreement. A live FastAPI response does serialise every key
   * (`null` at worst), so `?? null` at the three read sites is a formality
   * rather than a defence — but the schema is the contract, and a client that
   * claims more than the contract promises is exactly the drift #1400 exists to
   * make visible.
   */
  actor_display_name?: string | null
  actor_faction_slug?: string | null
  actor_avatar_url?: string | null
  payload: Record<string, any>
  /** Faction this card's frame themes to (surface #12): actor's faction, else
   *  the task's faction, else null (neutral). Derived server-side. */
  context_faction_slug: string | null
}

export interface FeedCounts {
  all: number
  friends: number
  foes: number
  your_stuff: number
  global_count: number
  requests: number
  /**
   * The type facet's counts (#1420, epic #1419 decision 4) — one entry per feed
   * type the CURRENT view could show, zeros included.
   *
   * It answers a different question from the six scalars above. Those are the
   * sidebar's "what is waiting for you" numbers and always describe the LIVE
   * feed, even while the archive is on screen; `by_type` describes the list the
   * caller is actually looking at, so on Archived it counts the archive.
   *
   * Computed under every active axis EXCEPT its own (decision 19), so ticking
   * one type never zeroes the rest and strands the player with no way back.
   * The zero rows are the client's to hide (decision 20) — they arrive so the
   * facet can tell "this view has no nudges" from "this view cannot have any".
   */
  by_type: Record<string, number>
}

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

/** Result of archiving/restoring one item. `archived` is the state AFTER the
 *  call (both endpoints are idempotent); `changed` says whether a row moved. */
export interface FeedItemArchiveResult {
  item_key: string
  archived: boolean
  changed: boolean
}

/** Result of a bulk archive/restore — how many items moved. */
export interface FeedBulkArchiveResult {
  count: number
  archived: boolean
}

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
 */
export async function dismissFeedItem(itemKey: string): Promise<FeedItemArchiveResult> {
  const { data } = await apiPost('/activity-feed/dismiss', { body: { item_key: itemKey } })
  return data
}

/** Take one feed item back out of the archive. */
export async function restoreFeedItem(itemKey: string): Promise<FeedItemArchiveResult> {
  const { data } = await apiPost('/activity-feed/restore', { body: { item_key: itemKey } })
  return data
}

/**
 * Archive everything the given filter currently returns. One call — the server
 * re-runs the feed for that filter, so the scope can never drift from what the
 * tab shows. `awaiting_submission` rows are SKIPPED, not refused.
 */
export async function dismissAllFeedItems(filter?: string): Promise<FeedBulkArchiveResult> {
  const { data } = await apiPost('/activity-feed/dismiss-all', { body: { filter: filter ?? null } })
  return data
}

/** Empty the archive (no filter = everything, which is what "Restore all" means
 *  on the Archived tab — the archived view has no tabs of its own). */
export async function restoreAllFeedItems(filter?: string): Promise<FeedBulkArchiveResult> {
  const { data } = await apiPost('/activity-feed/restore-all', { body: { filter: filter ?? null } })
  return data
}
