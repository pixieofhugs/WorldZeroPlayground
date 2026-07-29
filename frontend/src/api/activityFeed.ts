import api from './axios'

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
  actor_display_name: string | null
  actor_faction_slug: string | null
  actor_avatar_url: string | null
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
}

export interface ActivityFeedResponse {
  items: ActivityFeedItem[]
  counts: FeedCounts
  next_cursor: string | null
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
}): Promise<ActivityFeedResponse> {
  const { data } = await api.get<ActivityFeedResponse>('/activity-feed', { params })
  return data
}

/**
 * Put one feed item in the archive. 400 when the key is unknown, malformed, or
 * names an `awaiting_submission` row — that type is state, not an event, and the
 * backend refuses it. The UI must therefore not offer the control on that card
 * at all (hide unusable controls; never render them disabled).
 */
export async function dismissFeedItem(itemKey: string): Promise<FeedItemArchiveResult> {
  const { data } = await api.post<FeedItemArchiveResult>('/activity-feed/dismiss', {
    item_key: itemKey,
  })
  return data
}

/** Take one feed item back out of the archive. */
export async function restoreFeedItem(itemKey: string): Promise<FeedItemArchiveResult> {
  const { data } = await api.post<FeedItemArchiveResult>('/activity-feed/restore', {
    item_key: itemKey,
  })
  return data
}

/**
 * Archive everything the given filter currently returns. One call — the server
 * re-runs the feed for that filter, so the scope can never drift from what the
 * tab shows. `awaiting_submission` rows are SKIPPED, not refused.
 */
export async function dismissAllFeedItems(filter?: string): Promise<FeedBulkArchiveResult> {
  const { data } = await api.post<FeedBulkArchiveResult>('/activity-feed/dismiss-all', {
    filter: filter ?? null,
  })
  return data
}

/** Empty the archive (no filter = everything, which is what "Restore all" means
 *  on the Archived tab — the archived view has no tabs of its own). */
export async function restoreAllFeedItems(filter?: string): Promise<FeedBulkArchiveResult> {
  const { data } = await api.post<FeedBulkArchiveResult>('/activity-feed/restore-all', {
    filter: filter ?? null,
  })
  return data
}
