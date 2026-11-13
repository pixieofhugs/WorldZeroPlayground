import { apiGet, apiPost } from './client'
import type { components } from './generated/schema'
import { notifyRequestsChanged } from '../utils/requestsBus'

/**
 * Deliberately NOT the schema alias (#1400): the schema is a discriminated
 * union per feed type; adopting it means migrating consumers (#1402).
 */
export interface ActivityFeedItem {
  type: string
  /**
   * Archive identity (#1193): `"{type}:{source row PK}"`. The prefix is
   * load-bearing: several types share one source row, so a bare PK collides.
   */
  item_key: string
  timestamp: string
  /** Always sent, `null` at worst (`WireModel`, `backend/schemas/base.py`). */
  actor_display_name: string | null
  actor_faction_slug: string | null
  actor_avatar_url: string | null
  payload: Record<string, any>
  /** Frame theme: actor's faction, else task's, else null. Server-derived. */
  context_faction_slug: string | null
}

/**
 * The six scalars always describe the LIVE feed; `by_type` (#1420) describes
 * the current view (the archive on Archived), one entry per possible type,
 * zeros included (client hides them). Computed under every axis except its
 * own, so ticking one type never zeroes the rest.
 */
export type FeedCounts = components['schemas']['FeedCounts']

export interface ActivityFeedResponse {
  items: ActivityFeedItem[]
  counts: FeedCounts
  next_cursor: string | null
}

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
 * An older backend omits `by_type`, and `Object.keys(undefined)` in render
 * whites out the page. Normalise here, for every consumer; missing counts read 0.
 */
export function normalizeFeedCounts(raw: Partial<FeedCounts> | undefined | null): FeedCounts {
  return { ...ABSENT_COUNTS, ...(raw ?? {}) }
}

/**
 * Types the bell's `pending_requests_count` counts (ADR-0070), so archive
 * writes know when to ring the bus (#2220). Mirrors the server's set; pinned by
 * `__tests__/requestItemTypes.test.ts`. `awaiting_submission` feeds the bell
 * though it can't be archived (that rule is in `components/feed/feedItemLabels`).
 */
export const REQUEST_ITEM_TYPES: ReadonlySet<string> = new Set([
  'collab_invite',
  'duel_challenge',
  'invitation_letter',
  'awaiting_submission',
])

/** The key's prefix is the feed type. No prefix reads "not a request" (the server 400s it). */
function movesThePendingCount(itemKey: string): boolean {
  return REQUEST_ITEM_TYPES.has(itemKey.slice(0, itemKey.indexOf(':')))
}

/** `archived` is the state AFTER (idempotent); `changed` = a row moved. */
type FeedItemArchiveResult = components['schemas']['FeedItemArchiveResponse']

type FeedBulkArchiveResult = components['schemas']['FeedBulkArchiveResponse']

export async function getActivityFeed(params?: {
  filter?: string
  before?: string
  limit?: number
  /** Crossed WITH `filter`, not a member of it. */
  archived?: boolean
  /**
   * Intersected with `filter` (#1420); unknown values ignored, empty = no
   * constraint. Must be repeated bare keys, never `types[]=` (FastAPI silently
   * reads nothing); pinned by `__tests__/feedQueryParams.test.ts`.
   */
  types?: string[]
}): Promise<ActivityFeedResponse> {
  const { data } = await apiGet('/activity-feed', { params: { query: params } })
  // The one place `FeedCounts` enters the app.
  return { ...data, counts: normalizeFeedCounts(data?.counts) }
}

/** 400 for unknown/malformed keys and `awaiting_submission` rows — don't offer the control there. */
export async function dismissFeedItem(itemKey: string): Promise<FeedItemArchiveResult> {
  const { data } = await apiPost('/activity-feed/dismiss', { body: { item_key: itemKey } })
  if (movesThePendingCount(itemKey)) notifyRequestsChanged()
  return data
}

export async function restoreFeedItem(itemKey: string): Promise<FeedItemArchiveResult> {
  const { data } = await apiPost('/activity-feed/restore', { body: { item_key: itemKey } })
  if (movesThePendingCount(itemKey)) notifyRequestsChanged()
  return data
}

/**
 * Archive what the filter returns, scoped server-side; `awaiting_submission`
 * is skipped. Rings the bus unconditionally: the client holds no keys to test,
 * and a spare refetch beats a phantom badge (#2220).
 */
export async function dismissAllFeedItems(filter?: string): Promise<FeedBulkArchiveResult> {
  const { data } = await apiPost('/activity-feed/dismiss-all', { body: { filter: filter ?? null } })
  notifyRequestsChanged()
  return data
}

/** No filter = everything, including requests, so this can raise the bell. */
export async function restoreAllFeedItems(filter?: string): Promise<FeedBulkArchiveResult> {
  const { data } = await apiPost('/activity-feed/restore-all', { body: { filter: filter ?? null } })
  notifyRequestsChanged()
  return data
}
