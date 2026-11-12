import { apiGet } from './client'
import type { ActivityFeedItem } from './activityFeed'
import type { PraxisCardOut } from './praxis'

/**
 * The rail's three panels in one request (#1344). Carries no identity: folding
 * it into `/auth/me` would weigh down its ~20 refetchers (#1349).
 */
export interface SidebarPanels {
  /**
   * Unanswered requests (invites, challenges, own submissions, letters). A
   * count, not a list (#1456); equals the queue's `counts.requests` (ADR-0070).
   */
  pending_requests_count: number
  /**
   * "Recent activity": the LIVE feed minus obligations, newest five (#1556).
   * Partitions the feed with the Requests queue (same `_visible_types` call).
   * Named `global_activity` for history; don't rename — deploy skew would read
   * `undefined` and white-page the site.
   */
  global_activity: ActivityFeedItem[]
  /**
   * Total behind the five-item glance (#1587), from the same fetch (ADR-0036).
   * A floor at/above {@link ACTIVITY_COUNT_CAP}; render through that rule.
   * Deploy skew: may be `undefined` against an older API, so readers fall back
   * to wording without a number.
   */
  global_activity_count: number
  /** In-progress praxes the character is a MEMBER of; also what the slot bar counts. */
  active_praxes: PraxisCardOut[]
}

/**
 * The server's `SUB_QUERY_LIMIT`: per-source row cap, so a sum below it is
 * exact and at/above it a floor ("50+"). Pinned by `__tests__/activityCountCap.test.ts`.
 */
export const ACTIVITY_COUNT_CAP = 50

/**
 * No args (viewer from the JWT), so `SidebarProvider` fires it alongside
 * `/auth/me`. A guest's 401 is an answer: see `SESSION_PROBES` in `./sessionRedirect`.
 */
export async function getSidebar(): Promise<SidebarPanels> {
  const { data } = await apiGet('/me/sidebar')
  return data
}
